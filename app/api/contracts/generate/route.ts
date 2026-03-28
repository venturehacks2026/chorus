import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';

/**
 * POST /api/contracts/generate
 * Body: { workflow_id, agent_id, agent_name, agent_role, system_prompt, tools }
 * Returns: the newly inserted contracts
 */
export async function POST(req: Request) {
  const body = await req.json() as {
    workflow_id: string;
    agent_id: string;
    agent_name: string;
    agent_role: string;
    system_prompt: string;
    tools: string[];
  };

  if (!body.workflow_id || !body.agent_id || !body.agent_role) {
    return NextResponse.json({ error: 'workflow_id, agent_id, agent_role required' }, { status: 400 });
  }

  const anthropic = getAnthropic();

  const prompt = `You are a QA engineer writing behavioral verification contracts for an AI agent in an orchestration workflow.

Agent name: ${body.agent_name}
Agent role: ${body.agent_role}
System prompt: ${body.system_prompt ?? '(not set)'}
Tools available: ${(body.tools ?? []).join(', ') || 'none'}

Write 3 concise, measurable verification contracts that confirm this agent completed its task correctly.
Contracts serve as the ground truth for whether the workflow succeeded — they should validate:
1. That the agent's primary task was completed (output is not empty/off-topic)
2. That the output has the expected structure/format/content type for this agent's role
3. That any data-store writes happened (if data-store is a tool) or that results were produced in the expected form

Return ONLY a JSON array — no markdown, no explanation:
[
  {
    "description": "One-line pass/fail statement about what must be true (≤15 words)",
    "judge_prompt": "Specific instruction for an LLM evaluator. Tell it exactly what evidence to look for in the agent output to determine pass/fail. Reference the agent's specific role and expected output format.",
    "blocking": true | false
  }
]

Rules:
- description is declarative (e.g. "Agent produced at least 3 structured data records")
- judge_prompt must be precise and evaluatable — not vague
- blocking=true for: empty output, completely wrong task, data-store write failure on a storage agent
- blocking=false for: quality/completeness warnings, partial results
- If tools include data-store: one contract MUST verify that structured records were inserted
- If tools include web-scraper or rss-reader: one contract MUST verify that actual content was fetched (not an error message)`;

  let contracts: Array<{ description: string; judge_prompt: string; blocking: boolean }>;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0];
    if (text.type !== 'text') throw new Error('Expected text');
    const cleaned = text.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    contracts = JSON.parse(cleaned);
    if (!Array.isArray(contracts)) throw new Error('Not an array');
  } catch (err) {
    return NextResponse.json({ error: `Failed to generate contracts: ${String(err)}` }, { status: 422 });
  }

  const supabase = createServerSupabase();

  // Delete existing auto-generated contracts for this agent to avoid duplication
  await supabase
    .from('contracts')
    .delete()
    .eq('workflow_id', body.workflow_id)
    .eq('agent_id', body.agent_id);

  const rows = contracts.map((c, i) => ({
    workflow_id: body.workflow_id,
    agent_id: body.agent_id,
    description: c.description,
    judge_prompt: c.judge_prompt,
    blocking: c.blocking,
    sequence: i,
  }));

  const { data, error } = await supabase.from('contracts').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contracts: data }, { status: 201 });
}
