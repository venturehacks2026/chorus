import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get('workflow_id');
  const agentId = searchParams.get('agent_id');

  const supabase = createServerSupabase();
  let query = supabase.from('contracts').select('*').order('sequence');
  if (workflowId) query = query.eq('workflow_id', workflowId);
  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json() as { workflow_id: string; agent_id: string; description: string; judge_prompt: string; sequence?: number; blocking?: boolean };
  if (!body.workflow_id || !body.agent_id || !body.description || !body.judge_prompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('contracts')
    .insert({ ...body, sequence: body.sequence ?? 0, blocking: body.blocking ?? false })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
