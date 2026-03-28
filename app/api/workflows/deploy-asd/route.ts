import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { getEnabledSlugs } from '@/lib/enabled-connectors';
import { buildASDDeployPrompt } from '@/lib/asd-to-workflow-prompt';
import type { ASDDetail, SOPDetail } from '@/lib/knowledge-types';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const INGESTION_BASE = process.env.INGESTION_API_URL || 'http://localhost:8100';

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { asdId: string };

  if (!body.asdId) {
    return Response.json({ error: 'asdId is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(sse(data)));
      }

      try {
        // 1. Fetch ASD detail from ingestion API
        const asdRes = await fetch(`${INGESTION_BASE}/api/v1/asds/${body.asdId}`);
        if (!asdRes.ok) {
          send({ type: 'error', message: `Failed to fetch ASD: ${asdRes.status}` });
          controller.close();
          return;
        }
        const asd: ASDDetail = await asdRes.json();

        if (!asd.latest_version || asd.latest_version.nodes.length === 0) {
          send({ type: 'error', message: 'ASD has no compiled nodes' });
          controller.close();
          return;
        }

        // 2. Fetch SOP raw text for additional context (optional, graceful fallback)
        let sop: SOPDetail | null = null;
        try {
          const sopRes = await fetch(`${INGESTION_BASE}/api/v1/sops/${asd.sop_id}`);
          if (sopRes.ok) sop = await sopRes.json();
        } catch {
          // SOP text is supplemental — proceed without it
        }

        // 3. Get available connector slugs
        const enabledSlugs = await getEnabledSlugs();

        // 4. Build prompt
        const { systemPrompt, userMessage } = buildASDDeployPrompt(asd, sop, enabledSlugs);

        // 5. Create placeholder workflow
        const workflowName = `SOP: ${asd.skill_id}`;
        // Try with source_asd_id first; fall back without it if column doesn't exist yet
        let workflow: { id: string } | null = null;
        let wfError: { message: string } | null = null;
        {
          const res = await supabase
            .from('workflows')
            .insert({
              name: workflowName,
              nl_prompt: asd.description,
              source_asd_id: body.asdId,
              graph_json: { agents: [], edges: [] },
              status: 'draft',
            })
            .select()
            .single();
          if (res.error) {
            // Column may not exist — retry without source_asd_id
            const fallback = await supabase
              .from('workflows')
              .insert({
                name: workflowName,
                nl_prompt: asd.description,
                graph_json: { agents: [], edges: [] },
                status: 'draft',
              })
              .select()
              .single();
            workflow = fallback.data;
            wfError = fallback.error;
          } else {
            workflow = res.data;
          }
        }

        if (wfError || !workflow) {
          send({ type: 'error', message: wfError?.message ?? 'Failed to create workflow' });
          controller.close();
          return;
        }

        send({ type: 'created', workflowId: workflow.id });

        // 6. Stream Claude output
        const anthropic = getAnthropic();
        let rawJson = '';
        const emittedAgentIds = new Set<string>();

        const streamResp = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
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

        // 7. Parse final complete graph
        const cleaned = rawJson.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

        let graph: WorkflowGraph;
        try {
          graph = JSON.parse(cleaned) as WorkflowGraph;
        } catch {
          send({ type: 'error', message: 'Failed to parse generated workflow JSON' });
          controller.close();
          return;
        }

        // Ensure positions
        graph.agents = graph.agents.map((a, i) => ({
          ...a,
          position: a.position ?? { x: 150 + i * 420, y: 200 },
        }));

        // 8. Persist final graph
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
      Connection: 'keep-alive',
    },
  });
}
