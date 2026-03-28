import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/data/records?silo_id=xxx&table_name=yyy&limit=50
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siloId = searchParams.get('silo_id');
    const tableName = searchParams.get('table_name');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    if (!siloId) {
      return NextResponse.json({ error: 'silo_id is required' }, { status: 400 });
    }

    const supabase = createServerSupabase();

    let query = supabase
      .from('silo_records')
      .select('id, silo_id, table_name, data, tags, created_at, updated_at', { count: 'exact' })
      .eq('silo_id', siloId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tableName) query = query.eq('table_name', tableName);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ records: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('[data/records GET]', err);
    return NextResponse.json({ records: [], total: 0 });
  }
}

// DELETE /api/data/records — delete by ids
export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

    const supabase = createServerSupabase();
    const { error } = await supabase.from('silo_records').delete().in('id', ids);
    if (error) throw error;

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error('[data/records DELETE]', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
