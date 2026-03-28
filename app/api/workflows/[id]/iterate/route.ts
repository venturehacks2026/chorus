import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { getRegistry } from '@/connectors/registry';
import { SKILLS } from '@/lib/skills';
import type { WorkflowGraph, AgentNodeData } from '@/lib/types';

const ITERATE_SYSTEM_PROMPT = `You are a workflow architect for Chorus — an AI agent orchestration platform.

You are MODIFYING an existing workflow graph based on a user's instruction.
The current graph is provided as JSON. Apply the requested changes and return the FULL updated graph.

Rules:
- Keep all existing agents/edges unless the user explicitly asks to remove them
- When adding agents: use IDs like "agent-N" (next available number)
- When the user asks to add a skill to an agent, update that agent's system_prompt and tools accordingly
- model: "claude-haiku-4-5-20251001" | max_tokens: 4096
- Only use tools from the provided connector slugs
- Positions: maintain existing positions, space new agents 420px apart

Return ONLY valid JSON — the complete updated WorkflowGraph:
{
  "agents": [...],
  "edges": [...]
}`;

function fuzzyMatchAgent(agents: AgentNodeData[], query: string): AgentNodeData | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact name match
  const exact = agents.find(a => a.name.toLowerCase() === q);
  if (exact) return exact;

  // Substring match
  const sub = agents.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()));
  if (sub) return sub;

  // Word overlap match: compare word sets
  const qWords = new Set(q.split(/\s+/).filter(w => w.length > 2));
  let bestAgent: AgentNodeData | null = null;
  let bestOverlap = 0;
  for (const a of agents) {
    const nameWords = new Set(a.name.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    let overlap = 0;
    for (const w of qWords) {
      for (const nw of nameWords) {
        if (nw.includes(w) || w.includes(nw)) overlap++;
      }
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestAgent = a;
    }
  }
  return bestOverlap > 0 ? bestAgent : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;
  const body = await req.json() as { message: string };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: workflow } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const currentGraph = workflow.graph_json as WorkflowGraph;
  const registry = getRegistry();
  const slugs = Array.from(registry.keys());
  const anthropic = getAnthropic();

  // Parse /skill-xxx tokens from the message
  const skillMatches = body.message.match(/\/skill-([\w-]+)/g) ?? [];
  const matchedSkills = skillMatches
    .map(token => {
      const cmd = '/' + token.replace('/skill-', '');
      return SKILLS.find(s => s.command === cmd);
    })
    .filter(Boolean) as typeof SKILLS[number][];

  // Build skill context for the LLM
  let skillContext = '';
  if (matchedSkills.length > 0) {
    skillContext = '\n\n--- SKILL CONTEXT ---\nThe user referenced these skills. Apply them to the specified agent:\n' +
      matchedSkills.map(s =>
        `• ${s.command} (${s.name}): ${s.description}\n  System prompt addition: "${s.systemPrompt}"\n  Suggested tools: ${s.tools?.join(', ') ?? 'none'}`
      ).join('\n');
  }

  // Strip /skill tokens for the user message to the LLM
  const cleanMessage = body.message.replace(/\/skill-([\w-]+)/g, '').trim();

  const userMessage = `Current workflow graph:\n${JSON.stringify(currentGraph, null, 2)}\n\nAvailable connectors: ${slugs.join(', ')}\n\nUser instruction: ${cleanMessage}${skillContext}`;

  let graph: WorkflowGraph;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: ITERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = msg.content[0];
    if (text.type !== 'text') throw new Error('Expected text');
    const cleaned = text.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    graph = JSON.parse(cleaned) as WorkflowGraph;
    if (!Array.isArray(graph.agents)) throw new Error('Invalid graph: missing agents array');
  } catch (err) {
    return NextResponse.json({ error: `LLM failed: ${String(err)}` }, { status: 422 });
  }

  // Server-side skill enforcement: after LLM returns, forcefully apply skills to target agents
  if (matchedSkills.length > 0) {
    // Try to identify the target agent name from the user message
    // Look for patterns like "add /skill-X to <agent name>" or "give <agent name> /skill-X"
    const agentNamePatterns = [
      /(?:add|give|assign|apply)\s+\/skill-[\w-]+\s+to\s+(.+?)(?:\.|$)/i,
      /(?:add|give|assign|apply)\s+(.+?)\s+\/skill-[\w-]+/i,
      /\/skill-[\w-]+\s+(?:to|for|on)\s+(.+?)(?:\.|$)/i,
    ];

    let targetAgentName: string | null = null;
    for (const pattern of agentNamePatterns) {
      const m = body.message.match(pattern);
      if (m?.[1]) {
        targetAgentName = m[1].replace(/\/skill-[\w-]+/g, '').trim();
        break;
      }
    }

    if (targetAgentName) {
      const targetAgent = fuzzyMatchAgent(graph.agents, targetAgentName);
      if (targetAgent) {
        for (const skill of matchedSkills) {
          // Merge system prompt
          if (skill.systemPrompt && !targetAgent.system_prompt.includes(skill.systemPrompt)) {
            targetAgent.system_prompt = `${targetAgent.system_prompt}\n\n--- ${skill.name} Skill ---\n${skill.systemPrompt}`;
          }

          // Merge tools
          if (skill.tools?.length) {
            const existingToolIds = new Set(targetAgent.tools.map(t => t.connector_id));
            for (const toolSlug of skill.tools) {
              if (!existingToolIds.has(toolSlug) && registry.has(toolSlug)) {
                targetAgent.tools.push({
                  id: `tool-skill-${Date.now()}-${toolSlug}`,
                  connector_id: toolSlug,
                  label: toolSlug,
                  config: {},
                });
                existingToolIds.add(toolSlug);
              }
            }
          }
        }
      }
    }
  }

  // Ensure positions
  graph.agents = graph.agents.map((a, i) => ({
    ...a,
    position: a.position ?? { x: 150 + i * 420, y: 200 },
  }));

  // Persist
  await supabase.from('workflows').update({ graph_json: graph }).eq('id', workflowId);

  return NextResponse.json({ graph, nl_prompt: workflow.nl_prompt });
}
