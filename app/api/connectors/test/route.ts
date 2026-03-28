import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// POST /api/connectors/test — fire a minimal live request to verify the stored key works
export async function POST(req: Request) {
  const { slug } = await req.json() as { slug: string };
  if (!slug) return NextResponse.json({ ok: false, message: 'slug required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('connector_secrets')
    .select('secret_value')
    .eq('slug', slug)
    .single();

  if (error || !data?.secret_value) {
    return NextResponse.json({ ok: false, message: 'No API key stored — save one first.' });
  }

  const key = data.secret_value;

  try {
    if (slug === 'parallel-research') {
      // Parallel Web Systems Search API — POST /v1beta/search with x-api-key header
      const res = await fetch('https://api.parallel.ai/v1beta/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({
          objective: 'connectivity test',
          search_queries: ['test'],
          mode: 'fast',
          max_results: 1,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return NextResponse.json({ ok: true, message: `Connected — Parallel Web Systems responded (HTTP ${res.status})` });
      const body = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, message: `HTTP ${res.status}: ${body.slice(0, 200)}` });
    }

    if (slug === 'perplexity') {
      // Perplexity Sonar API — minimal chat completion
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return NextResponse.json({ ok: true, message: `Connected — Perplexity responded (HTTP ${res.status})` });
      const body = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, message: `HTTP ${res.status}: ${body.slice(0, 200)}` });
    }

    return NextResponse.json({ ok: false, message: `No test defined for connector "${slug}"` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: `Request failed: ${msg}` });
  }
}
