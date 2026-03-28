import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

export class ParallelResearchConnector extends ConnectorBase {
  slug = 'parallel-research';
  name = 'Parallel Web Research';
  description = 'Run multiple web searches concurrently and merge results. Faster and broader than single web-search for research tasks.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of 2–5 search queries to run in parallel',
      },
      count_per_query: {
        type: 'number',
        description: 'Results per query (default 4)',
      },
    },
    required: ['queries'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { queries, count_per_query = (config.count_per_query as number) ?? 4 } =
      input as { queries: string[]; count_per_query?: number };

    const apiKey = secrets.brave_api_key ?? secrets.BRAVE_API_KEY;
    if (!apiKey) return { content: 'Error: brave_api_key not set — add it in the Marketplace.' };
    if (!Array.isArray(queries) || queries.length === 0) {
      return { content: 'Error: queries must be a non-empty array of strings.' };
    }

    const capped = queries.slice(0, 5);

    const results = await Promise.allSettled(
      capped.map(q =>
        fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count_per_query}`,
          { headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey } },
        ).then(r => r.json() as Promise<{ web?: { results?: Array<{ title: string; url: string; description: string }> } }>),
      ),
    );

    // Merge and deduplicate by URL
    const seen = new Set<string>();
    const merged: Array<{ title: string; url: string; description: string; query: string }> = [];

    results.forEach((res, i) => {
      if (res.status === 'rejected') return;
      const items = res.value.web?.results ?? [];
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          merged.push({ ...item, query: capped[i] });
        }
      }
    });

    if (merged.length === 0) return { content: 'No results found across any queries.' };

    const formatted = merged
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}\n   *(query: ${r.query})*`)
      .join('\n\n');

    return {
      content: `Parallel research across ${capped.length} queries — ${merged.length} unique results:\n\n${formatted}`,
    };
  }
}
