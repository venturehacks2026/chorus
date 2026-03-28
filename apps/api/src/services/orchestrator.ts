import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowGraph, AgentNodeData, Contract, StepKind } from 'chorus-shared';
import { VaultClient } from './vault-client.js';
import { validateContracts } from './contract-validator.js';
import type { ConnectorRegistry } from '../connectors/registry.js';

export interface OrchestratorDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  vault: VaultClient;
  connectors: ConnectorRegistry;
}

/** Topological sort of agents using DFS */
function topologicalSort(graph: WorkflowGraph): AgentNodeData[] {
  const agentMap = new Map(graph.agents.map((a) => [a.id, a]));
  const visited = new Set<string>();
  const result: AgentNodeData[] = [];

  // Build adjacency: which agents depend on which (edge: source → target)
  const deps = new Map<string, Set<string>>();
  for (const agent of graph.agents) {
    deps.set(agent.id, new Set());
  }
  for (const edge of graph.edges) {
    deps.get(edge.target_agent_id)?.add(edge.source_agent_id);
  }

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of deps.get(id) ?? []) {
      visit(dep);
    }
    const agent = agentMap.get(id);
    if (agent) result.push(agent);
  }

  for (const agent of graph.agents) {
    visit(agent.id);
  }

  return result;
}

let stepSequence = 0;

async function insertStep(
  supabase: SupabaseClient,
  agentExecutionId: string,
  kind: StepKind,
  payload: Record<string, unknown>,
) {
  await supabase.from('execution_steps').insert({
    agent_execution_id: agentExecutionId,
    kind,
    sequence: stepSequence++,
    payload: { kind, ...payload },
  });
}

export async function runWorkflow(
  workflowId: string,
  deps: OrchestratorDeps,
): Promise<string> {
  const { supabase, anthropic, vault, connectors } = deps;

  // Load workflow
  const { data: workflow, error: workflowErr } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (workflowErr || !workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const graph = workflow.graph_json as WorkflowGraph;

  // Create execution record
  const { data: execution, error: execErr } = await supabase
    .from('executions')
    .insert({ workflow_id: workflowId, status: 'running' })
    .select()
    .single();

  if (execErr || !execution) {
    throw new Error('Failed to create execution record');
  }

  stepSequence = 0;

  // Update workflow status
  await supabase.from('workflows').update({ status: 'running' }).eq('id', workflowId);

  let executionFailed = false;
  let contextFromPreviousAgent = '';

  try {
    const sortedAgents = topologicalSort(graph);

    for (const agent of sortedAgents) {
      // Create agent_execution row
      const { data: agentExec, error: agentExecErr } = await supabase
        .from('agent_executions')
        .insert({
          execution_id: execution.id,
          agent_id: agent.id,
          status: 'running',
          input_context: { context: contextFromPreviousAgent },
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (agentExecErr || !agentExec) {
        throw new Error(`Failed to create agent_execution for agent ${agent.id}`);
      }

      // Build tool definitions
      const toolDefs: Anthropic.Tool[] = [];
      const connectorSecretsCache: Record<string, Record<string, string>> = {};

      for (const agentTool of agent.tools) {
        const connector = connectors.get(agentTool.connector_id);
        if (!connector) continue;

        toolDefs.push(connector.toAnthropicTool());

        if (!connectorSecretsCache[agentTool.connector_id]) {
          connectorSecretsCache[agentTool.connector_id] = await vault.getConnectorSecrets(
            agentTool.connector_id,
          );
        }
      }

      // Build messages
      const messages: Anthropic.MessageParam[] = [];
      if (contextFromPreviousAgent) {
        messages.push({
          role: 'user',
          content: `Previous agent output and context:\n${contextFromPreviousAgent}\n\nPlease proceed with your task.`,
        });
      } else {
        messages.push({
          role: 'user',
          content: 'Please proceed with your assigned task.',
        });
      }

      let agentFinalOutput = '';
      let agentFailed = false;

      try {
        // Run agent with streaming + tool use loop
        let continueLoop = true;
        let currentMessages = [...messages];

        while (continueLoop) {
          const stream = anthropic.messages.stream({
            model: agent.model ?? 'claude-opus-4-5',
            max_tokens: agent.max_tokens ?? 4096,
            system: agent.system_prompt,
            tools: toolDefs.length > 0 ? toolDefs : undefined,
            messages: currentMessages,
          });

          let accumulatedText = '';
          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

          // Stream events
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                accumulatedText += event.delta.text;
                await insertStep(supabase, agentExec.id, 'llm_call', {
                  delta: event.delta.text,
                });
              } else if (event.delta.type === 'input_json_delta') {
                // Tool input streaming — handled on stop_reason
              }
            } else if (event.type === 'content_block_stop') {
              // Handled below
            }
          }

          const finalMessage = await stream.finalMessage();

          // Collect tool use blocks from final message
          for (const block of finalMessage.content) {
            if (block.type === 'tool_use') {
              toolUseBlocks.push(block);
            } else if (block.type === 'text' && block.text && !accumulatedText) {
              accumulatedText = block.text;
            }
          }

          if (accumulatedText) {
            agentFinalOutput = accumulatedText;
          }

          if (finalMessage.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
            continueLoop = false;
          } else {
            // Process tool calls
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolBlock of toolUseBlocks) {
              const connector = connectors.get(toolBlock.name);

              await insertStep(supabase, agentExec.id, 'tool_call', {
                tool_name: toolBlock.name,
                tool_use_id: toolBlock.id,
                input: toolBlock.input,
              });

              let toolOutput = '';
              let toolError: string | undefined;

              if (connector) {
                // Find agent tool config for this connector
                const agentToolConfig = agent.tools.find(
                  (t) => t.connector_id === toolBlock.name,
                );
                const secrets = connectorSecretsCache[toolBlock.name] ?? {};

                try {
                  const result = await connector.call({
                    config: agentToolConfig?.config ?? {},
                    secrets,
                    input: toolBlock.input,
                  });
                  toolOutput = result.content;
                } catch (err) {
                  toolError = String(err);
                  toolOutput = `Error: ${toolError}`;
                }
              } else {
                toolOutput = `Error: connector "${toolBlock.name}" not found`;
                toolError = toolOutput;
              }

              await insertStep(supabase, agentExec.id, 'tool_call', {
                tool_name: toolBlock.name,
                tool_use_id: toolBlock.id,
                output: toolOutput,
                error: toolError,
              });

              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: toolOutput,
              });
            }

            // Continue with tool results
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: finalMessage.content },
              { role: 'user', content: toolResults },
            ];
          }
        }
      } catch (err) {
        agentFailed = true;
        await insertStep(supabase, agentExec.id, 'routing', {
          message: `Agent failed: ${String(err)}`,
        });
      }

      // Update agent_execution
      await supabase
        .from('agent_executions')
        .update({
          status: agentFailed ? 'failed' : 'completed',
          output_context: { output: agentFinalOutput },
          completed_at: new Date().toISOString(),
          error: agentFailed ? 'Agent execution failed' : null,
        })
        .eq('id', agentExec.id);

      // Run contract validation
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('agent_id', agent.id)
        .order('sequence');

      if (contracts && contracts.length > 0) {
        const contractResults = await validateContracts(
          contracts as Contract[],
          agentFinalOutput,
          agentExec.id,
          anthropic,
          supabase,
        );

        // Check for blocking failures
        for (const cr of contractResults) {
          const contract = (contracts as Contract[]).find((c) => c.id === cr.contractId);
          if (contract?.blocking && cr.result === 'fail') {
            executionFailed = true;
            await insertStep(supabase, agentExec.id, 'contract_check', {
              contract_id: cr.contractId,
              description: contract.description,
              result: cr.result,
              reasoning: cr.reasoning,
            });
            break;
          }
        }
      }

      if (agentFailed || executionFailed) {
        executionFailed = true;
        break;
      }

      contextFromPreviousAgent = agentFinalOutput;
    }
  } catch (err) {
    executionFailed = true;
    console.error('[Orchestrator] Execution error:', err);
  }

  // Finalize execution
  await supabase
    .from('executions')
    .update({
      status: executionFailed ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
      error: executionFailed ? 'One or more agents failed' : null,
    })
    .eq('id', execution.id);

  await supabase
    .from('workflows')
    .update({ status: executionFailed ? 'failed' : 'completed' })
    .eq('id', workflowId);

  return execution.id;
}
