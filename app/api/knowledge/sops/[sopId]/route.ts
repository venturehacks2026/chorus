import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('sop_documents')
    .select('*')
    .eq('id', sopId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('sop_documents')
    .delete()
    .eq('id', sopId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
