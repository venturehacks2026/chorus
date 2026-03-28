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

  // Note the time before we fire so we can find the right execution row
  const beforeRun = new Date().toISOString();

  // Fire-and-forget orchestration
  runWorkflow(body.workflow_id, {
    supabase,
    anthropic: getAnthropic(),
    connectors: getRegistry(),
  }).catch(console.error);

  // Poll up to 3s for the execution row to appear
  let execId: string | null = null;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 200));
    const { data: exec } = await supabase
      .from('executions')
      .select('id')
      .eq('workflow_id', body.workflow_id)
      .gte('triggered_at', beforeRun)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single();
    if (exec?.id) { execId = exec.id; break; }
  }

  if (!execId) {
    // Last attempt — grab the most recent execution regardless of time
    const { data: exec } = await supabase
      .from('executions')
      .select('id')
      .eq('workflow_id', body.workflow_id)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single();
    execId = exec?.id ?? null;
  }

  return NextResponse.json({ execution_id: execId }, { status: 202 });
}
