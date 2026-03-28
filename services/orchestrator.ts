import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowGraph, AgentNodeData, Contract, StepKind } from '@/lib/types';
import { validateContracts } from './contract-validator';
import type { ConnectorRegistry } from '@/connectors/registry';

export interface OrchestratorDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  connectors: ConnectorRegistry;
}

// ─── Graph analysis ───────────────────────────────────────────────────────────

/**
 * Returns execution stages: each stage is an array of agents that can run
 * in parallel (no cross-dependencies within the stage).
 * Agents with the same parallel_group in the same topological level are batched.
 */
function buildExecutionPlan(graph: WorkflowGraph): AgentNodeData[][] {
  const agentMap = new Map(graph.agents.map(a => [a.id, a]));

  // Build dependency map: agent -> set of agents it depends on
  const deps = new Map<string, Set<string>>();
  for (const agent of graph.agents) deps.set(agent.id, new Set());
  for (const edge of graph.edges) {
    deps.get(edge.target_agent_id)?.add(edge.source_agent_id);
  }

  const completed = new Set<string>();
  const stages: AgentNodeData[][] = [];

  while (completed.size < graph.agents.length) {
    // Find all agents whose dependencies are all satisfied
    const ready = graph.agents.filter(a =>
      !completed.has(a.id) &&
      [...(deps.get(a.id) ?? [])].every(dep => completed.has(dep))
    );

    if (ready.length === 0) break; // cycle guard

    // Group by parallel_group if present, otherwise each is its own group
    const groups = new Map<string, AgentNodeData[]>();
    for (const agent of ready) {
      const key = (agent as AgentNodeData & { parallel_group?: string }).parallel_group ?? agent.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(agent);
    }

    // Each group runs as one stage (groups within a stage all run in parallel)
    // If multiple independent groups exist, merge them into one parallel stage
    const stage: AgentNodeData[] = ready;
    stages.push(stage);
    stage.forEach(a => completed.add(a.id));
  }

  return stages;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let seq = 0;

async function insertStep(
  supabase: SupabaseClient,
  agentExecutionId: string,
  kind: StepKind,
  payload: Record<string, unknown>,
) {
  await supabase.from('execution_steps').insert({
    agent_execution_id: agentExecutionId,
    kind,
    sequence: seq++,
    payload: { kind, ...payload },
  });
}

// Env-var fallback map (connector slug → env var names)
const SECRET_ENV_MAP: Record<string, string[]> = {
  'parallel-research': ['PARALLEL_API_KEY'],
  'perplexity':        ['PERPLEXITY_API_KEY'],
};

function getSecretsFromEnv(connectorSlug: string): Record<string, string> {
  const keys = SECRET_ENV_MAP[connectorSlug] ?? [];
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = process.env[key];
    if (val) result[key.toLowerCase()] = val;
  }
  return result;
}

async function getSecrets(connectorSlug: string, supabase: SupabaseClient): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from('connector_secrets')
      .select('secret_value')
      .eq('slug', connectorSlug)
      .single();

    if (data?.secret_value) {
      const envKeys = SECRET_ENV_MAP[connectorSlug] ?? [];
      const result: Record<string, string> = {};
      for (const key of envKeys) {
        result[key.toLowerCase()] = data.secret_value;
      }
      if (Object.keys(result).length) return result;
    }
  } catch {
    // silently fall through to env
  }
  return getSecretsFromEnv(connectorSlug);
}

// ─── Knowledge base context loader ───────────────────────────────────────────

async function loadKnowledgeContext(workflowId: string, supabase: SupabaseClient): Promise<string> {
  try {
    // Fetch global docs + docs linked to this workflow
    const { data } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .or(`is_global.eq.true,workflow_id.eq.${workflowId}`)
      .order('created_at', { ascending: false })
      .limit(10); // Cap to avoid context overflow

    if (!data?.length) return '';

    const sections = (data as Array<{ title: string; content: string; category: string | null }>)
      .map(doc => `### ${doc.title}${doc.category ? ` [${doc.category}]` : ''}\n${doc.content.slice(0, 1500)}`)
      .join('\n\n');

    return `\n\n---\n## Company Knowledge Base\nThe following context represents company policies, guidelines, and background information. Use this to inform your decisions and ensure your output aligns with company values and constraints.\n\n${sections}\n---`;
  } catch {
    return '';
  }
}

// ─── Single agent runner ──────────────────────────────────────────────────────

async function runAgent(
  agent: AgentNodeData,
  context: string,
  executionId: string,
  workflowId: string,
  deps: OrchestratorDeps,
): Promise<{ output: string; failed: boolean }> {
  const { supabase, anthropic, connectors } = deps;

  const { data: agentExec } = await supabase
    .from('agent_executions')
    .insert({
      execution_id: executionId,
      agent_id: agent.id,
      status: 'running',
      input_context: { context },
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (!agentExec) return { output: '', failed: true };

  const toolDefs: Anthropic.Tool[] = [];
  for (const t of agent.tools) {
    const connector = connectors.get(t.connector_id);
    if (connector) toolDefs.push(connector.toAnthropicTool());
  }

  // Inject knowledge base context into agent system prompt
  const kbContext = await loadKnowledgeContext(workflowId, supabase);
  const systemPrompt = `${agent.system_prompt as string}${kbContext}`;

  const userContent = context
    ? `Previous context:\n${context}\n\nProceed with your task.`
    : 'Proceed with your assigned task.';

  let finalOutput = '';
  let agentFailed = false;

  try {
    let messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }];
    let looping = true;

    while (looping) {
      const stream = anthropic.messages.stream({
        model: (agent.model as string) ?? 'claude-haiku-4-5-20251001',
        max_tokens: (agent.max_tokens as number) ?? 4096,
        system: systemPrompt,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        messages,
      });

      let accText = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          accText += event.delta.text;
          await insertStep(supabase, agentExec.id, 'llm_call', { delta: event.delta.text });
        }
      }

      const final = await stream.finalMessage();
      if (accText) finalOutput = accText;

      const toolUses = final.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];

      if (final.stop_reason === 'end_turn' || toolUses.length === 0) {
        looping = false;
      } else {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          const connector = connectors.get(tu.name);
          await insertStep(supabase, agentExec.id, 'tool_call', {
            tool_name: tu.name, tool_use_id: tu.id, input: tu.input,
          });

          let output = '';
          let toolError: string | undefined;
          if (connector) {
            const cfg = (agent.tools as AgentNodeData['tools']).find(t => t.connector_id === tu.name);
            // Inject workflow_id into data-store config so it can scope its silo
            const extraConfig = tu.name === 'data-store' ? { workflow_id: workflowId } : {};
            try {
              const r = await connector.call({
                config: { ...(cfg?.config ?? {}), ...extraConfig },
                secrets: await getSecrets(tu.name, supabase),
                input: tu.input,
              });
              output = r.content;
            } catch (err) {
              toolError = String(err);
              output = `Error: ${toolError}`;
            }
          } else {
            output = `Error: connector "${tu.name}" not found`;
            toolError = output;
          }

          await insertStep(supabase, agentExec.id, 'tool_call', {
            tool_name: tu.name, tool_use_id: tu.id, output, error: toolError,
          });
          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: output });
        }

        messages = [
          ...messages,
          { role: 'assistant', content: final.content },
          { role: 'user', content: toolResults },
        ];
      }
    }
  } catch (err) {
    agentFailed = true;
    await insertStep(supabase, agentExec.id, 'routing', { message: `Agent error: ${String(err)}` });
  }

  await supabase
    .from('agent_executions')
    .update({
      status: agentFailed ? 'failed' : 'completed',
      output_context: { output: finalOutput },
      completed_at: new Date().toISOString(),
    })
    .eq('id', agentExec.id);

  // Run contracts for this agent
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('agent_id', agent.id)
    .order('sequence');

  if (contracts?.length) {
    const results = await validateContracts(
      contracts as Contract[],
      finalOutput,
      agentExec.id,
      anthropic,
      supabase,
    );
    for (const cr of results) {
      const c = (contracts as Contract[]).find(x => x.id === cr.contractId);
      if (c?.blocking && cr.result === 'fail') {
        return { output: finalOutput, failed: true };
      }
    }
  }

  return { output: finalOutput, failed: agentFailed };
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runWorkflow(workflowId: string, deps: OrchestratorDeps): Promise<string> {
  const { supabase } = deps;
  seq = 0;

  const { data: workflow } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  const graph = workflow.graph_json as WorkflowGraph;

  const { data: execution } = await supabase
    .from('executions')
    .insert({ workflow_id: workflowId, status: 'running' })
    .select()
    .single();

  if (!execution) throw new Error('Failed to create execution');
  await supabase.from('workflows').update({ status: 'running' }).eq('id', workflowId);

  let failed = false;
  let context = '';

  try {
    const stages = buildExecutionPlan(graph);

    for (const stage of stages) {
      if (failed) break;

      if (stage.length === 1) {
        // Sequential: run single agent
        const result = await runAgent(stage[0], context, execution.id, workflowId, deps);
        if (result.failed) { failed = true; break; }
        context = result.output;
      } else {
        // Parallel: run all agents in stage concurrently with the same context
        const results = await Promise.all(
          stage.map(agent => runAgent(agent, context, execution.id, workflowId, deps))
        );
        if (results.some(r => r.failed)) { failed = true; break; }
        // Merge outputs for next stage
        context = results.map((r, i) => `[${stage[i].name}]: ${r.output}`).join('\n\n---\n\n');
      }
    }
  } catch (err) {
    failed = true;
    console.error('[Orchestrator]', err);
  }

  await supabase
    .from('executions')
    .update({ status: failed ? 'failed' : 'completed', completed_at: new Date().toISOString() })
    .eq('id', execution.id);

  await supabase
    .from('workflows')
    .update({ status: failed ? 'failed' : 'completed' })
    .eq('id', workflowId);

  return execution.id;
}
