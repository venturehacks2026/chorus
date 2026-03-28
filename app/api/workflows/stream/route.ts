import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { getRegistry } from '@/connectors/registry';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const SYSTEM_PROMPT = `You are a workflow architect for Chorus — an AI agent orchestration platform where workflows enforce company policies and guidelines.

Given a natural-language task, design a WorkflowGraph of focused agents that collectively accomplish the task. The workflow should be policy-aligned: agents work within stated constraints, and contracts will be used to verify task completion.

━━━ DESIGN RULES ━━━
- Use 2–5 agents; each agent has ONE clear, scoped responsibility
- Agent IDs: "agent-1", "agent-2", etc. | Edge IDs: "edge-1", "edge-2", etc. | Tool IDs: "tool-1", "tool-2", etc.
- model: "claude-haiku-4-5-20251001" | max_tokens: 2048
- ONLY use tools from the provided connector slugs — never invent tool names

━━━ TOOL SELECTION GUIDE ━━━

MANDATORY RULE: Any agent that needs to search, research, gather intelligence, or find information MUST use perplexity or parallel-research as its PRIMARY tool. These marketplace tools produce cited, high-quality results. Never use code-executor or web-scraper as a substitute for actual web research.

Marketplace tools (use these FIRST for any research/search task):
- perplexity: deep research with cited sources — USE THIS for any research, current events, brand monitoring, competitor analysis, fact-finding
- parallel-research: run 2-5 concurrent searches and merge results — USE THIS for broad multi-query research, monitoring multiple topics

Built-in tools (use alongside marketplace tools, not as replacements):
- web-scraper: fetch content from a SPECIFIC known URL — only use when you already have a URL to scrape
- rss-reader: read RSS/Atom feeds — use for monitoring specific RSS feed URLs
- json-api: call specific REST APIs (GitHub, weather, finance) — use when you know the exact API endpoint
- code-executor: run JavaScript for computation, transformation, analysis — NOT for web searching
- data-store: persist structured results — do NOT pass workflow_id (it is auto-injected). Just pass action, silo_name, and data.
- http: raw HTTP requests to specific endpoints
- memory: ephemeral key-value within a single execution
- file-reader: read local files

━━━ CRITICAL: TOOL ASSIGNMENT ━━━
- "web-search" does NOT exist. Never use it.
- Every workflow that involves research, monitoring, or data gathering MUST include at least one agent with perplexity or parallel-research in its tools array.
- Agents doing research should have perplexity (for deep single-topic research) or parallel-research (for multi-query breadth) as their FIRST tool.
- Data processing and storage agents should use code-executor and data-store.

━━━ AGENT OUTPUT STYLE ━━━
- Agents must produce clean, professional output: plain text and markdown only.
- Do NOT use emojis in agent system_prompt or in output.
- Use markdown headings, bullet points, and tables for structure — not emojis or decorative characters.

━━━ DATA STORAGE RULE ━━━
Any agent that produces structured output (research results, scraped data, metrics, generated content) MUST include data-store in its tools and insert results as structured JSON objects with meaningful field names. Example: {"title": "...", "url": "...", "summary": "...", "score": 8.5}
When calling data-store, only pass: action, silo_name, table_name, and data. The workflow_id is injected automatically — never pass it yourself.

━━━ PARALLEL AGENTS ━━━
- Agents with the same parallel_group letter run concurrently (e.g. multiple scrapers)
- Sequential agents have no parallel_group (or different letters)
- Edges describe data flow regardless of parallelism

━━━ SYSTEM PROMPT GUIDE ━━━
Each agent's system_prompt must be specific and actionable:
- State exactly what the agent must do and what output it must produce
- Reference the company context or policy if mentioned in the task
- For data-storing agents: "Store results to silo '[descriptive_name]', table '[table_name]' using data-store with fields: {field1, field2, ...}"
- For final/summary agents: "Verify that all required data was collected and summarize findings. Your output will be evaluated against contracts."
- EVERY agent system_prompt MUST include: "If any required context is missing, make reasonable assumptions and state them. Never ask for user input — you are running autonomously."
- EVERY agent system_prompt MUST include: "EFFICIENCY: You have a budget of 8 tool calls max. Batch queries into single parallel-research calls (2-5 queries per call). Gather all data in 1-3 calls, then produce your final output. Keep output under 1500 words."

━━━ POSITIONS ━━━
- Sequential: x increases by 500, y = 200
- Parallel group: same x, y spaced by 220 (e.g. 100, 320)
- Leave 500px gap before and after parallel groups

Return ONLY valid JSON — no markdown, no explanation.

{
  "agents": [{
    "id": string,
    "name": string,
    "role": string,
    "system_prompt": string,
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 2048,
    "parallel_group": string | null,
    "tools": [{ "id": string, "connector_id": string, "label": string, "config": {} }],
    "position": { "x": number, "y": number }
  }],
  "edges": [{ "id": string, "source_agent_id": string, "target_agent_id": string, "label": string }]
}`;

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; nl_prompt: string };

  if (!body.name || !body.nl_prompt) {
    return NextResponse.json({ error: 'name and nl_prompt are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const registry = getRegistry();
  const slugs = Array.from(registry.keys());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(sse(data)));
      }

      try {
        // 1. Create placeholder workflow immediately
        const { data: workflow, error: wfError } = await supabase
          .from('workflows')
          .insert({ name: body.name, nl_prompt: body.nl_prompt, graph_json: { agents: [], edges: [] }, status: 'draft' })
          .select()
          .single();

        if (wfError || !workflow) {
          send({ type: 'error', message: wfError?.message ?? 'DB insert failed' });
          controller.close();
          return;
        }

        send({ type: 'created', workflowId: workflow.id });

        // 2. Stream Claude output, parse agents as they appear
        const anthropic = getAnthropic();
        let rawJson = '';
        const emittedAgentIds = new Set<string>();

        const streamResp = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Available connectors: ${slugs.join(', ')}\n\nTask: ${body.nl_prompt}`,
          }],
        });

        for await (const event of streamResp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            rawJson += event.delta.text;

            // Extract complete agent objects as they stream in
            // Find agent-N IDs not yet emitted and try to extract their full object
            const idMatches = rawJson.matchAll(/"id"\s*:\s*"(agent-\d+)"/g);
            for (const idMatch of idMatches) {
              const agentId = idMatch[1];
              if (emittedAgentIds.has(agentId)) continue;
              // Find the opening brace before this id
              const idPos = idMatch.index!;
              let depth = 0, start = -1;
              for (let i = idPos; i >= 0; i--) {
                if (rawJson[i] === '}') depth++;
                else if (rawJson[i] === '{') {
                  if (depth === 0) { start = i; break; }
                  depth--;
                }
              }
              if (start === -1) continue;
              // Find the closing brace
              depth = 0;
              let end = -1;
              for (let i = start; i < rawJson.length; i++) {
                if (rawJson[i] === '{') depth++;
                else if (rawJson[i] === '}') {
                  depth--;
                  if (depth === 0) { end = i; break; }
                }
              }
              if (end === -1) continue;
              try {
                const agent = JSON.parse(rawJson.slice(start, end + 1)) as AgentNodeData;
                if (!agent.position) {
                  agent.position = { x: 150 + emittedAgentIds.size * 500, y: 200 };
                }
                emittedAgentIds.add(agentId);
                send({ type: 'agent', agent });
              } catch {
                // incomplete object, keep accumulating
              }
            }
          }
        }

        // 3. Parse final complete graph — try multiple strategies
        let graph: WorkflowGraph | null = null;

        // Strategy 1: strip markdown fences then parse
        const stripped = rawJson
          .replace(/^```(?:json)?\s*/gm, '')
          .replace(/^```\s*/gm, '')
          .trim();
        try {
          graph = JSON.parse(stripped) as WorkflowGraph;
        } catch { /* try next */ }

        // Strategy 2: extract the outermost JSON object
        if (!graph) {
          const start = rawJson.indexOf('{');
          const end = rawJson.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            try {
              graph = JSON.parse(rawJson.slice(start, end + 1)) as WorkflowGraph;
            } catch { /* try next */ }
          }
        }

        // Strategy 3: use whatever agents were already streamed
        if (!graph && emittedAgentIds.size > 0) {
          console.warn('[stream] Falling back to streamed agents only');
          graph = { agents: [], edges: [] };
        }

        if (!graph) {
          send({ type: 'error', message: 'Failed to parse final graph JSON' });
          controller.close();
          return;
        }

        // Ensure positions with 420px spacing
        graph.agents = graph.agents.map((a, i) => ({
          ...a,
          position: a.position ?? { x: 150 + i * 500, y: 200 },
        }));

        // 4. Persist final graph
        await supabase.from('workflows').update({ graph_json: graph }).eq('id', workflow.id);

        send({ type: 'done', graph });

      } catch (err) {
        controller.enqueue(encoder.encode(sse({ type: 'error', message: String(err) })));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
