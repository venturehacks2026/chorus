import Anthropic from '@anthropic-ai/sdk';
import type { WorkflowGraph, AgentNodeData, AgentEdge } from 'chorus-shared';

const SYSTEM_PROMPT = `You are a workflow architect for an AI agent orchestration platform called Chorus.

Given a natural-language description of a task, produce a JSON WorkflowGraph where:
- Each agent has a single, clear responsibility
- Agents are connected by edges representing data flow (output of one feeds input of next)
- Each agent is assigned tools from the available connector slugs

Rules:
- Use 2-6 agents depending on complexity
- Agent IDs must be lowercase-kebab-case UUIDs like "agent-1", "agent-2"
- Edge IDs must be "edge-1", "edge-2", etc.
- Tool IDs must be "tool-1", "tool-2", etc.
- Positions should create a left-to-right flow: first agent at x:100, subsequent agents 300px apart
- system_prompt should be specific and action-oriented for the agent's role
- Only assign tools from the provided connector slugs
- max_tokens default is 4096

Return ONLY a valid JSON object matching this TypeScript interface:
interface WorkflowGraph {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    system_prompt: string;
    model: string;
    max_tokens: number;
    tools: Array<{ id: string; connector_id: string; label: string; config: {} }>;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source_agent_id: string;
    target_agent_id: string;
    label?: string;
  }>;
}`;

export async function parseNlToWorkflow(
  nlPrompt: string,
  availableConnectorSlugs: string[],
  anthropic: Anthropic,
): Promise<WorkflowGraph> {
  const userMessage = `Available connector slugs: ${availableConnectorSlugs.join(', ')}

Task description:
${nlPrompt}

Return only the JSON WorkflowGraph object with no additional text or markdown fences.`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0];
  if (raw.type !== 'text') {
    throw new Error('Expected text response from NL parser');
  }

  // Strip markdown fences if present
  const json = raw.text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim();

  let graph: WorkflowGraph;
  try {
    graph = JSON.parse(json) as WorkflowGraph;
  } catch {
    throw new Error(`NL parser returned invalid JSON: ${json.slice(0, 200)}`);
  }

  // Ensure positions are set
  graph.agents = graph.agents.map((agent: AgentNodeData, i: number) => ({
    ...agent,
    position: agent.position ?? { x: 100 + i * 300, y: 200 },
  }));

  return graph;
}
