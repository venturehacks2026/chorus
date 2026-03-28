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

function topologicalSort(graph: WorkflowGraph): AgentNodeData[] {
  const agentMap = new Map(graph.agents.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const result: AgentNodeData[] = [];

  const deps = new Map<string, Set<string>>();
  for (const agent of graph.agents) deps.set(agent.id, new Set());
  for (const edge of graph.edges) {
    deps.get(edge.target_agent_id)?.add(edge.source_agent_id);
  }

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of deps.get(id) ?? []) visit(dep);
    const agent = agentMap.get(id);
    if (agent) result.push(agent);
  }

  for (const agent of graph.agents) visit(agent.id);
  return result;
}

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

export async function runWorkflow(workflowId: string, deps: OrchestratorDeps): Promise<string> {
  const { supabase, anthropic, connectors } = deps;
  seq = 0;

  const { data: workflow } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

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
    for (const agent of topologicalSort(graph)) {
      const { data: agentExec } = await supabase
        .from('agent_executions')
        .insert({
          execution_id: execution.id,
          agent_id: agent.id,
          status: 'running',
          input_context: { context },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!agentExec) { failed = true; break; }

      // Build tools + get secrets from env (Vault optional)
      const toolDefs: Anthropic.Tool[] = [];
      for (const agentTool of agent.tools) {
        const connector = connectors.get(agentTool.connector_id);
        if (connector) toolDefs.push(connector.toAnthropicTool());
      }

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
            model: (agent.model as string) ?? 'claude-opus-4-5',
            max_tokens: (agent.max_tokens as number) ?? 4096,
            system: agent.system_prompt as string,
            tools: toolDefs.length > 0 ? toolDefs : undefined,
            messages,
          });

          let accText = '';
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              accText += event.delta.text;
              await insertStep(supabase, agentExec.id, 'llm_call', { delta: event.delta.text });
            }
          }

          const final = await stream.finalMessage();
          if (accText) finalOutput = accText;

          const toolUses = final.content.filter((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock[];

          if (final.stop_reason === 'end_turn' || toolUses.length === 0) {
            looping = false;
          } else {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const tu of toolUses) {
              const connector = connectors.get(tu.name);
              await insertStep(supabase, agentExec.id, 'tool_call', {
                tool_name: tu.name,
                tool_use_id: tu.id,
                input: tu.input,
              });

              let output = '';
              let toolError: string | undefined;
              if (connector) {
                const agentToolCfg = (agent.tools as AgentNodeData['tools']).find(
                  (t) => t.connector_id === tu.name,
                );
                try {
                  const r = await connector.call({
                    config: agentToolCfg?.config ?? {},
                    secrets: getSecretsFromEnv(tu.name),
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
                tool_name: tu.name,
                tool_use_id: tu.id,
                output,
                error: toolError,
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
        await insertStep(supabase, agentExec.id, 'routing', {
          message: `Agent error: ${String(err)}`,
        });
      }

      await supabase
        .from('agent_executions')
        .update({
          status: agentFailed ? 'failed' : 'completed',
          output_context: { output: finalOutput },
          completed_at: new Date().toISOString(),
        })
        .eq('id', agentExec.id);

      // Run contracts
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
          const c = (contracts as Contract[]).find((x) => x.id === cr.contractId);
          if (c?.blocking && cr.result === 'fail') {
            failed = true;
            break;
          }
        }
      }

      if (agentFailed || failed) { failed = true; break; }
      context = finalOutput;
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

/** Pull connector secrets from env vars: e.g. BRAVE_API_KEY for web-search */
function getSecretsFromEnv(connectorSlug: string): Record<string, string> {
  const secretMap: Record<string, string[]> = {
    'web-search': ['BRAVE_API_KEY'],
    'perplexity': ['PERPLEXITY_API_KEY'],
  };
  const keys = secretMap[connectorSlug] ?? [];
  const result: Record<string, string> = {};
  for (const key of keys) {
    const envKey = key.toLowerCase().replace(/-/g, '_');
    const val = process.env[key] ?? process.env[envKey];
    if (val) result[key.toLowerCase()] = val;
  }
  return result;
}
