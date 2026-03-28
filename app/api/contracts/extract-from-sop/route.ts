import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';

/**
 * POST /api/contracts/extract-from-sop
 * Body: { sop_id, sop_content, sop_title }
 * Extracts contract templates from an SOP and stores them with sop_id only (no workflow/agent).
 */
export async function POST(req: Request) {
  const body = await req.json() as {
    sop_id: string;
    sop_content: string;
    sop_title?: string;
  };

  if (!body.sop_id || !body.sop_content) {
    return NextResponse.json({ error: 'sop_id and sop_content required' }, { status: 400 });
  }

  const anthropic = getAnthropic();

  const prompt = `You are a compliance analyst extracting behavioral contracts from a Standard Operating Procedure (SOP) document.

SOP Title: ${body.sop_title ?? '(untitled)'}
SOP Content:
${body.sop_content.slice(0, 6000)}

Extract 3–8 verifiable contracts from this SOP. Each contract should be a testable requirement that agents must follow. Focus on:
1. Must-always rules (things that must be done)
2. Must-never rules (things that must not happen)
3. Quality/format requirements
4. Compliance and policy adherence

Return ONLY a JSON array:
[
  {
    "description": "One-line declarative check (≤15 words)",
    "judge_prompt": "Specific instruction for an LLM judge to verify this contract against agent output. Be precise about what evidence to look for.",
    "blocking": true | false
  }
]

Rules:
- description should be declarative, testable
- judge_prompt must reference the SOP requirement and explain how to verify it
- blocking=true for critical compliance/safety/correctness requirements
- blocking=false for quality/completeness recommendations`;

  let contracts: Array<{ description: string; judge_prompt: string; blocking: boolean }>;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0];
    if (text.type !== 'text') throw new Error('Expected text');
    const cleaned = text.text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    contracts = JSON.parse(cleaned);
    if (!Array.isArray(contracts)) throw new Error('Not an array');
  } catch (err) {
    return NextResponse.json({ error: `Failed to extract contracts: ${String(err)}` }, { status: 422 });
  }

  const supabase = createServerSupabase();

  // Remove existing SOP-derived templates for this SOP
  await supabase
    .from('contracts')
    .delete()
    .eq('sop_id', body.sop_id)
    .is('workflow_id', null);

  const rows = contracts.map((c, i) => ({
    sop_id: body.sop_id,
    workflow_id: null,
    agent_id: null,
    description: c.description,
    judge_prompt: c.judge_prompt,
    blocking: c.blocking,
    sequence: i,
  }));

  const { data, error } = await supabase.from('contracts').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contracts: data, count: data?.length ?? 0 }, { status: 201 });
}
