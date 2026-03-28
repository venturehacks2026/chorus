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
- model: "claude-haiku-4-5-20251001" | max_tokens: 4096
- ONLY use tools from the provided connector slugs — never invent tool names

━━━ TOOL SELECTION GUIDE ━━━
- web-scraper: fetch and extract clean text/metadata from any URL — USE THIS for reading web pages, articles, product pages
- rss-reader: read RSS/Atom feeds for news, blog posts, updates — USE THIS for monitoring content sources
- json-api: call any public JSON REST API (GitHub, weather, finance, HN, etc.) — USE THIS for structured data from APIs
- web-search: search the web via Brave API (requires BRAVE_API_KEY in env)
- perplexity: deep research queries (requires PERPLEXITY_API_KEY in env)
- code-executor: run JavaScript to compute, transform, analyze, or call APIs — USE FOR data processing, calculations, generating scripts
- data-store: persist structured results so they survive and are visible in the Data tab — ALWAYS insert as {"field": value} objects
- http: raw HTTP requests when exact control is needed
- memory: ephemeral key-value within a single execution
- file-reader: read files from the local filesystem

━━━ DATA STORAGE RULE ━━━
Any agent that produces structured output (research results, scraped data, metrics, generated content) MUST include data-store in its tools and insert results as structured JSON objects with meaningful field names. Example: {"title": "...", "url": "...", "summary": "...", "score": 8.5}

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

━━━ POSITIONS ━━━
- Sequential: x increases by 420, y = 200
- Parallel group: same x, y spaced by 180 (e.g. 120, 300)
- Leave 420px gap before and after parallel groups

Return ONLY valid JSON — no markdown, no explanation.

{
  "agents": [{
    "id": string,
    "name": string,
    "role": string,
    "system_prompt": string,
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 4096,
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
  const body = await req.json() as { name: string; nl_prompt: string; context_sop?: string };

  if (!body.name || !body.nl_prompt) {
    return NextResponse.json({ error: 'name and nl_prompt are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const registry = getRegistry();
  const slugs = Array.from(registry.keys());

  let docContext = '';
  if (body.context_sop?.trim()) {
    const text = body.context_sop.slice(0, 12000);
    docContext =
      '\n\n━━━ ATTACHED SOP DOCUMENT ━━━\n' +
      text +
      '\n━━━ END SOP DOCUMENT ━━━\n\nUse this SOP as the source of truth when designing the workflow.\n\n';
  }

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
            content: `Available connectors: ${slugs.join(', ')}\n\nTask: ${body.nl_prompt}${docContext}`,
          }],
        });

        for await (const event of streamResp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            rawJson += event.delta.text;

            // Extract complete agent objects as they stream in
            const agentRegex = /\{[^{}]*"id"\s*:\s*"(agent-\d+)"[\s\S]*?"position"\s*:\s*\{[^}]+\}[^{}]*\}/g;
            let match: RegExpExecArray | null;
            while ((match = agentRegex.exec(rawJson)) !== null) {
              const agentId = match[1];
              if (!emittedAgentIds.has(agentId)) {
                try {
                  const agent = JSON.parse(match[0]) as AgentNodeData;
                  // Ensure proper spacing if position missing
                  if (!agent.position) {
                    agent.position = { x: 150 + emittedAgentIds.size * 420, y: 200 };
                  }
                  emittedAgentIds.add(agentId);
                  send({ type: 'agent', agent });
                } catch {
                  // partial match, keep accumulating
                }
              }
            }
          }
        }

        // 3. Parse final complete graph
        const cleaned = rawJson.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

        let graph: WorkflowGraph;
        try {
          graph = JSON.parse(cleaned) as WorkflowGraph;
        } catch {
          send({ type: 'error', message: 'Failed to parse final graph JSON' });
          controller.close();
          return;
        }

        // Ensure positions with 420px spacing
        graph.agents = graph.agents.map((a, i) => ({
          ...a,
          position: a.position ?? { x: 150 + i * 420, y: 200 },
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
