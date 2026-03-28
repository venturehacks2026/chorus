import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/knowledge?category=&workflow_id=&global=true&search=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const workflowId = searchParams.get('workflow_id');
    const globalOnly = searchParams.get('global') === 'true';
    const search = searchParams.get('search');

    const supabase = createServerSupabase();

    let query = supabase
      .from('knowledge_base')
      .select('id, title, content_type, category, tags, source_url, is_global, workflow_id, word_count, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (workflowId) query = query.or(`workflow_id.eq.${workflowId},is_global.eq.true`);
    else if (globalOnly) query = query.eq('is_global', true);

    const { data, error } = await query;
    if (error) throw error;

    // Apply text search client-side for simplicity (or use full-text for large datasets)
    const results = search
      ? (data ?? []).filter(d =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          (d.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (d.tags ?? []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
        )
      : (data ?? []);

    return NextResponse.json(results);
  } catch (err) {
    console.error('[knowledge GET]', err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/knowledge — create a KB doc
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, content_type = 'text', category, tags, source_url, is_global = true, workflow_id } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        title: title.trim(),
        content: content.trim(),
        content_type,
        category: category?.trim() ?? null,
        tags: tags ?? [],
        source_url: source_url?.trim() ?? null,
        is_global,
        workflow_id: workflow_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[knowledge POST]', err);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
