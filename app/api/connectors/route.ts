import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getRegistry } from '@/connectors/registry';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('connectors').select('*').order('name');
    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data);
    }
  } catch {
    // fall through to registry
  }

  // Fall back to in-code registry so the marketplace always loads
  const registry = getRegistry();
  const connectors = Array.from(registry.values()).map((c) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon_url: null,
    config_schema: {},
    vault_secret_keys: getVaultKeys(c.slug),
    built_at: new Date().toISOString(),
  }));

  return NextResponse.json(connectors);
}

function getVaultKeys(slug: string): string[] {
  const map: Record<string, string[]> = {
    'parallel-research': ['PARALLEL_API_KEY'],
    'perplexity':        ['PERPLEXITY_API_KEY'],
    'http':              [],
    'code-executor':     [],
    'file-reader':       [],
    'memory':            [],
    'data-store':        [],
    'web-scraper':       [],
    'rss-reader':        [],
    'json-api':          [],
  };
  return map[slug] ?? [];
}
