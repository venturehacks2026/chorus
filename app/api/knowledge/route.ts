import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getAnthropic } from '@/lib/anthropic';
import { parseNlToWorkflow } from '@/services/nl-parser';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .like('nl_prompt', '[SOP]%')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { title: string; content: string; doc_type?: string };

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: connectors } = await supabase.from('connectors').select('slug');
    const slugs = (connectors ?? []).map((c: { slug: string }) => c.slug);

    const sopPrompt = `Based on the following ${body.doc_type?.toUpperCase() ?? 'SOP'} document, create an agent workflow that automates this process:\n\nTitle: ${body.title}\n\n${body.content}`;

    const graph = await parseNlToWorkflow(sopPrompt, slugs, getAnthropic());

    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        name: `ASD: ${body.title}`,
        nl_prompt: `[SOP] ${body.title}: ${body.content.slice(0, 400)}`,
        description: body.content.slice(0, 200),
        graph_json: graph,
        status: 'draft',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
