import Anthropic from '@anthropic-ai/sdk';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const SYSTEM_PROMPT = `You are a workflow architect for Chorus — an AI agent orchestration platform.

Given a natural-language task, design a WorkflowGraph. Each agent has ONE focused responsibility.

TOOL SELECTION:
- web-scraper: fetch/extract text from any URL — no API key needed
- rss-reader: parse RSS/Atom feeds into structured items — no API key needed
- json-api: call any public JSON REST API — no API key needed for public endpoints
- web-search: Brave Search (needs BRAVE_API_KEY)
- perplexity: deep research (needs PERPLEXITY_API_KEY)
- code-executor: run JavaScript for computation, transformation, or scripting
- data-store: persist structured JSON {"field": value} results to named silos — use for any output that should be saved
- http: raw HTTP requests
- memory: ephemeral key-value store
- file-reader: read local files

Rules:
- Use 2–5 agents | Agent IDs: "agent-1", "agent-2", etc. | Tool IDs: "tool-1", "tool-2", etc.
- model: "claude-haiku-4-5-20251001" | max_tokens: 4096
- Only use tools from the provided connector slugs
- Agents producing structured output MUST use data-store to save results as {"field": value} objects
- Positions: first agent x:150 y:200, each subsequent +320px on x

Return ONLY valid JSON — no markdown, no explanation.

{
  "agents": [{
    "id": string, "name": string, "role": string, "system_prompt": string,
    "model": "claude-haiku-4-5-20251001", "max_tokens": 4096,
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
