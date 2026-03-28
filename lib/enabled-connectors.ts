import { createServerSupabase } from './supabase-server';

const FREE_CONNECTORS = ['web-scraper', 'rss-reader', 'json-api', 'code-executor', 'data-store', 'http', 'memory', 'file-reader'];
const KEYED_CONNECTORS = ['web-search', 'perplexity', 'parallel-research'];

export async function getEnabledSlugs(): Promise<string[]> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.from('connector_secrets').select('slug').in('slug', KEYED_CONNECTORS);
    return [...FREE_CONNECTORS, ...(data ?? []).map((r: { slug: string }) => r.slug)];
  } catch {
    return FREE_CONNECTORS;
  }
}
