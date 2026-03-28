import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/data/silos?workflow_id=xxx  — list silos (optionally filtered)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflow_id');

    const supabase = createServerSupabase();

    let query = supabase
      .from('data_silos')
      .select(`
        id, workflow_id, name, description, created_at, updated_at,
        workflows:workflow_id (id, name)
      `)
      .order('created_at', { ascending: false });

    if (workflowId) query = query.eq('workflow_id', workflowId);

    const { data, error } = await query;
    if (error) throw error;

    // Add row counts per silo
    const silosWithCounts = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map(async (silo: any) => {
        const { count } = await supabase
          .from('silo_records')
          .select('*', { count: 'exact', head: true })
          .eq('silo_id', silo.id);

        const { data: tables } = await supabase
          .from('silo_records')
          .select('table_name')
          .eq('silo_id', silo.id);

        const tableNames = [...new Set((tables ?? []).map((r: { table_name: string }) => r.table_name))];

        return { ...silo, record_count: count ?? 0, tables: tableNames };
      })
    );

    return NextResponse.json(silosWithCounts);
  } catch (err) {
    console.error('[data/silos GET]', err);
    return NextResponse.json([], { status: 200 }); // Graceful fallback
  }
}

// POST /api/data/silos — create a silo manually
export async function POST(req: Request) {
  try {
    const { workflow_id, name, description } = await req.json();
    if (!workflow_id || !name) {
      return NextResponse.json({ error: 'workflow_id and name are required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('data_silos')
      .upsert({ workflow_id, name, description: description ?? null }, { onConflict: 'workflow_id,name' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[data/silos POST]', err);
    return NextResponse.json({ error: 'Failed to create silo' }, { status: 500 });
  }
}
