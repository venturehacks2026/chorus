import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('sop_documents')
    .select('id, title, source_type, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
