import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const agentExecutionId = searchParams.get('agent_execution_id');

  const supabase = createServerSupabase();

  if (agentExecutionId) {
    const { data, error } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('agent_execution_id', agentExecutionId)
      .order('sequence');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data: agentExecs } = await supabase
    .from('agent_executions').select('id').eq('execution_id', id);

  const ids = (agentExecs ?? []).map((a: { id: string }) => a.id);
  if (!ids.length) return NextResponse.json([]);

  const { data, error } = await supabase
    .from('execution_steps').select('*').in('agent_execution_id', ids).order('sequence');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
