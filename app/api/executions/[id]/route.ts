import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: execution, error } = await supabase
    .from('executions').select('*').eq('id', id).single();

  if (error || !execution) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: agentExecutions } = await supabase
    .from('agent_executions').select('*').eq('execution_id', id).order('started_at');

  return NextResponse.json({ execution, agent_executions: agentExecutions ?? [] });
}
