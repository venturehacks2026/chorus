import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { parseNlToWorkflow } from '@/services/nl-parser';

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json() as { name: string; nl_prompt: string };

  if (!body.name || !body.nl_prompt) {
    return NextResponse.json({ error: 'name and nl_prompt are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: connectors } = await supabase.from('connectors').select('slug');
  const slugs = (connectors ?? []).map((c: { slug: string }) => c.slug);

  let graph;
  try {
    graph = await parseNlToWorkflow(body.nl_prompt, slugs, getAnthropic());
  } catch (err) {
    return NextResponse.json({ error: `Failed to parse: ${String(err)}` }, { status: 422 });
  }

  const { data: workflow, error } = await supabase
    .from('workflows')
    .insert({ name: body.name, nl_prompt: body.nl_prompt, graph_json: graph, status: 'draft' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflow }, { status: 201 });
}
