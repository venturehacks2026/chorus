import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/connectors/secrets/[slug] — check if a secret exists (never returns the value)
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('connector_secrets')
      .select('slug')
      .eq('slug', slug)
      .single();

    return NextResponse.json({ exists: !!data });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
