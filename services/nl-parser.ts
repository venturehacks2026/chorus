import Anthropic from '@anthropic-ai/sdk';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const SYSTEM_PROMPT = `You are a workflow architect for Chorus — an AI agent orchestration platform.

Given a natural-language task, design a WorkflowGraph. Each agent has ONE focused responsibility.

TOOL SELECTION:

MANDATORY: Any agent that searches, researches, or gathers information MUST use perplexity or parallel-research as its primary tool.

Marketplace tools (use FIRST for any research/search):
- perplexity: deep research with cited sources — for research, monitoring, brand analysis, fact-finding
- parallel-research: concurrent multi-query search — for broad multi-topic research

Built-in tools (use alongside marketplace tools, not as replacements for search):
- web-scraper: fetch content from a specific known URL only
- rss-reader: parse specific RSS/Atom feed URLs
- json-api: call specific known REST API endpoints
- code-executor: computation, transformation, analysis — NOT for web searching
- data-store: persist structured results (workflow_id is auto-injected, do not pass it)
- http: raw HTTP requests to known endpoints
- memory: ephemeral key-value store
- file-reader: read local files

"web-search" does NOT exist. Never assign it. Every research workflow MUST have perplexity or parallel-research on data-gathering agents.

AGENT OUTPUT STYLE:
- Do NOT include emojis in system_prompt text or output.
- Use plain markdown: headings, bullets, tables. No decorative characters.

Rules:
- Use 2–5 agents | Agent IDs: "agent-1", "agent-2", etc. | Tool IDs: "tool-1", "tool-2", etc.
- model: "claude-haiku-4-5-20251001" | max_tokens: 2048
- Only use tools from the provided connector slugs
- Agents producing structured output MUST use data-store to save results as {"field": value} objects
- Positions: first agent x:150 y:200, each subsequent +500px on x

Return ONLY valid JSON — no markdown, no explanation.

{
  "agents": [{
    "id": string, "name": string, "role": string, "system_prompt": string,
    "model": "claude-haiku-4-5-20251001", "max_tokens": 2048,
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
    position: a.position ?? { x: 150 + i * 500, y: 200 },
  }));

  return graph;
}
