import Anthropic from '@anthropic-ai/sdk';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const SYSTEM_PROMPT = `You are a workflow architect for Chorus, an AI agent orchestration platform.

Given a natural-language task description, return a JSON WorkflowGraph where each agent has a single clear responsibility.

Rules:
- Use 2–5 agents
- Agent IDs: "agent-1", "agent-2", etc.
- Edge IDs: "edge-1", "edge-2", etc.
- Tool IDs: "tool-1", "tool-2", etc.
- Positions: first agent at x:150, y:200 — each subsequent agent 320px to the right
- Only use tools from the provided connector slugs
- model default: "claude-haiku-4-5-20251001"
- max_tokens default: 4096

Return ONLY valid JSON — no markdown, no explanation.

Schema:
{
  "agents": [{
    "id": string,
    "name": string,
    "role": string,
    "system_prompt": string,
    "model": string,
    "max_tokens": number,
    "tools": [{ "id": string, "connector_id": string, "label": string, "config": {} }],
    "position": { "x": number, "y": number }
  }],
  "edges": [{ "id": string, "source_agent_id": string, "target_agent_id": string, "label": string }]
}`;

export async function parseNlToWorkflow(
  nlPrompt: string,
  availableConnectorSlugs: string[],
  anthropic: Anthropic,
): Promise<WorkflowGraph> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Available connectors: ${availableConnectorSlugs.join(', ')}\n\nTask: ${nlPrompt}`,
      },
    ],
  });

  const raw = message.content[0];
  if (raw.type !== 'text') throw new Error('Expected text from NL parser');

  const json = raw.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  let graph: WorkflowGraph;
  try {
    graph = JSON.parse(json) as WorkflowGraph;
  } catch {
    throw new Error(`NL parser returned invalid JSON:\n${json.slice(0, 300)}`);
  }

  // Ensure positions
  graph.agents = graph.agents.map((a: AgentNodeData, i: number) => ({
    ...a,
    position: a.position ?? { x: 150 + i * 320, y: 200 },
  }));

  return graph;
}
