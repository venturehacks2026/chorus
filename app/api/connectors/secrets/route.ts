import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// POST /api/connectors/secrets — upsert a connector API key
export async function POST(req: Request) {
  try {
    const { slug, secret_value } = await req.json() as { slug: string; secret_value: string };
    if (!slug || !secret_value) {
      return NextResponse.json({ error: 'slug and secret_value required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from('connector_secrets')
      .upsert({ slug, secret_value, updated_at: new Date().toISOString() }, { onConflict: 'slug' });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/connectors/secrets error:', e);
    return NextResponse.json({ error: 'Failed to save secret' }, { status: 500 });
  }
}
