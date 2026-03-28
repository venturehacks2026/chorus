import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { runWorkflow } from '@/services/orchestrator';
import { getRegistry } from '@/connectors/registry';

export async function POST(req: Request) {
  const body = await req.json() as { workflow_id: string };
  if (!body.workflow_id) {
    return NextResponse.json({ error: 'workflow_id required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: workflow } = await supabase
    .from('workflows').select('id, status').eq('id', body.workflow_id).single();

  if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  if (workflow.status === 'running') {
    return NextResponse.json({ error: 'Already running' }, { status: 409 });
  }

  // Fire-and-forget
  runWorkflow(body.workflow_id, {
    supabase,
    anthropic: getAnthropic(),
    connectors: getRegistry(),
  }).catch(console.error);

  // Brief wait to capture execution_id
  await new Promise((r) => setTimeout(r, 100));

  const { data: exec } = await supabase
    .from('executions')
    .select('id')
    .eq('workflow_id', body.workflow_id)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ execution_id: exec?.id }, { status: 202 });
}
