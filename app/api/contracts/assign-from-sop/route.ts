import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import type { AgentNodeData, Contract } from '@/lib/types';

/**
 * POST /api/contracts/assign-from-sop
 * Body: { sop_id, workflow_id, agents: AgentNodeData[] }
 * Fetches SOP template contracts, uses LLM to decide which contracts belong to which agents,
 * then copies them into the contracts table with workflow_id + agent_id set.
 */
export async function POST(req: Request) {
  const body = await req.json() as {
    sop_id: string;
    workflow_id: string;
    agents: AgentNodeData[];
  };

  if (!body.sop_id || !body.workflow_id || !body.agents?.length) {
    return NextResponse.json({ error: 'sop_id, workflow_id, and agents required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Fetch SOP template contracts
  const { data: templates } = await supabase
    .from('contracts')
    .select('*')
    .eq('sop_id', body.sop_id)
    .is('workflow_id', null)
    .order('sequence');

  if (!templates?.length) {
    return NextResponse.json({ error: 'No SOP contract templates found. Extract contracts from the SOP first.' }, { status: 404 });
  }

  const anthropic = getAnthropic();

  const agentSummaries = body.agents.map(a => ({
    id: a.id,
    name: a.name,
    role: a.role,
    tools: a.tools.map(t => t.connector_id),
  }));

  const contractSummaries = (templates as Contract[]).map((c, i) => ({
    index: i,
    description: c.description,
    judge_prompt: c.judge_prompt,
    blocking: c.blocking,
  }));

  const prompt = `You are assigning SOP-derived contracts to specific agents in a workflow.

Agents:
${JSON.stringify(agentSummaries, null, 2)}

Available contracts (from the SOP):
${JSON.stringify(contractSummaries, null, 2)}

For each contract, decide which agent should be responsible for satisfying it.
A contract may apply to multiple agents if appropriate.
Some contracts may not match any agent — skip those.

Return ONLY a JSON array of assignments:
[
  { "contract_index": 0, "agent_id": "agent-1" },
  { "contract_index": 2, "agent_id": "agent-2" }
]`;

  let assignments: Array<{ contract_index: number; agent_id: string }>;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0];
    if (text.type !== 'text') throw new Error('Expected text');
    const cleaned = text.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    assignments = JSON.parse(cleaned);
    if (!Array.isArray(assignments)) throw new Error('Not an array');
  } catch (err) {
    return NextResponse.json({ error: `Assignment LLM failed: ${String(err)}` }, { status: 422 });
  }

  const agentIds = new Set(body.agents.map(a => a.id));
  const validAssignments = assignments.filter(
    a => a.contract_index >= 0 && a.contract_index < templates.length && agentIds.has(a.agent_id),
  );

  if (!validAssignments.length) {
    return NextResponse.json({ message: 'No contracts matched any agents', assigned: 0 });
  }

  // Delete existing SOP-assigned contracts for this workflow to avoid duplication
  await supabase
    .from('contracts')
    .delete()
    .eq('workflow_id', body.workflow_id)
    .eq('sop_id', body.sop_id);

  // Copy template contracts with workflow_id + agent_id
  const rows = validAssignments.map((a, i) => {
    const template = templates[a.contract_index] as Contract;
    return {
      sop_id: body.sop_id,
      workflow_id: body.workflow_id,
      agent_id: a.agent_id,
      description: template.description,
      judge_prompt: template.judge_prompt,
      blocking: template.blocking,
      sequence: i,
    };
  });

  const { data, error } = await supabase.from('contracts').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contracts: data, assigned: data?.length ?? 0 }, { status: 201 });
}
