import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabase();

  const { data: workflow, error } = await supabase
    .from('workflows').select('*').eq('id', id).single();

  if (error || !workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: contracts } = await supabase
    .from('contracts').select('*').eq('workflow_id', id).order('sequence');

  return NextResponse.json({ workflow, contracts: contracts ?? [] });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { graph_json?: unknown; canvas_json?: unknown };
  const supabase = createServerSupabase();

  const update: Record<string, unknown> = {};
  if (body.graph_json !== undefined) {
    update.graph_json = body.graph_json;
    update.status = 'draft';
  }
  if (body.canvas_json !== undefined) {
    update.canvas_json = body.canvas_json;
  }

  const { data: workflow, error } = await supabase
    .from('workflows')
    .update(update)
    .eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflow });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
