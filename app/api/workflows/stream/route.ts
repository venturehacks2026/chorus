import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { getRegistry } from '@/connectors/registry';
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
        // 1. Create placeholder workflow immediately so we have an ID to navigate to
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

        // 2. Stream Claude's JSON output and parse agents as they appear
        const anthropic = getAnthropic();
        let rawJson = '';

        const streamResp = anthropic.messages.stream({
            model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Available connectors: ${slugs.join(', ')}\n\nTask: ${body.nl_prompt}`,
            },
          ],
        });

        // Track which agents we've already emitted
        const emittedAgentIds = new Set<string>();

        for await (const event of streamResp) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            rawJson += event.delta.text;

            // Try to extract complete agent objects as they stream in
            // Matches each complete agent object in the agents array
            const agentRegex = /\{\s*"id"\s*:\s*"(agent-\d+)"[\s\S]*?"position"\s*:\s*\{[^}]+\}\s*\}/g;
            let match: RegExpExecArray | null;
            while ((match = agentRegex.exec(rawJson)) !== null) {
              const agentId = match[1];
              if (!emittedAgentIds.has(agentId)) {
                try {
                  const agentJson = match[0];
                  const agent = JSON.parse(agentJson) as AgentNodeData;
                  agent.position = agent.position ?? { x: 150 + emittedAgentIds.size * 320, y: 200 };
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
        const cleaned = rawJson
          .replace(/^```(?:json)?\s*/m, '')
          .replace(/\s*```$/m, '')
          .trim();

        let graph: WorkflowGraph;
        try {
          graph = JSON.parse(cleaned) as WorkflowGraph;
        } catch {
          send({ type: 'error', message: 'Failed to parse final graph JSON' });
          controller.close();
          return;
        }

        // Ensure positions
        graph.agents = graph.agents.map((a, i) => ({
          ...a,
          position: a.position ?? { x: 150 + i * 320, y: 200 },
        }));

        // 4. Persist final graph
        await supabase
          .from('workflows')
          .update({ graph_json: graph })
          .eq('id', workflow.id);

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
