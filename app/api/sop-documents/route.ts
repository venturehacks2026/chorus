import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * GET /api/sop-documents
 * Lists SOP rows from Supabase `sop_documents` (ingestion pipeline).
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('sop_documents')
      .select('id, title, source_type, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[sop-documents]', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('[sop-documents]', e);
    return NextResponse.json([]);
  }
}
