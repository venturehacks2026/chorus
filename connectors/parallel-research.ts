import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

interface ParallelResult {
  url: string;
  title: string;
  excerpts: string[];
  publish_date: string | null;
}

interface ParallelResponse {
  search_id: string;
  results: ParallelResult[];
}

export class ParallelResearchConnector extends ConnectorBase {
  slug = 'parallel-research';
  name = 'Parallel Web Research';
  description = 'Run multiple web searches concurrently via Parallel Web Systems and merge results. Faster and broader than single searches for research tasks.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of 2–5 search queries to run in parallel',
      },
      objective: {
        type: 'string',
        description: 'High-level research objective (improves result quality)',
      },
      count_per_query: {
        type: 'number',
        description: 'Max results per query (default 5)',
      },
    },
    required: ['queries'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const {
      queries,
      objective,
      count_per_query = (config.count_per_query as number) ?? 5,
    } = input as { queries: string[]; objective?: string; count_per_query?: number };

    const apiKey = secrets.parallel_api_key ?? secrets.PARALLEL_API_KEY;
    if (!apiKey) return { content: 'Error: Parallel Web Systems API key not set — add it in the Marketplace.' };
    if (!Array.isArray(queries) || queries.length === 0) {
      return { content: 'Error: queries must be a non-empty array of strings.' };
    }

    const capped = queries.slice(0, 5);

    const res = await fetch('https://api.parallel.ai/v1beta/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        objective: objective ?? capped.join('; '),
        search_queries: capped,
        mode: 'fast',
        excerpts: { max_chars_per_result: Math.floor(10000 / capped.length) },
        max_results: count_per_query,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { content: `Parallel Web Systems error (HTTP ${res.status}): ${err.slice(0, 200)}` };
    }

    const data = await res.json() as ParallelResponse;
    const results = data.results ?? [];

    if (results.length === 0) return { content: 'No results found.' };

    const formatted = results
      .map((r, i) => {
        const excerpt = r.excerpts?.[0]?.slice(0, 400) ?? '';
        return `${i + 1}. **${r.title}**\n   ${r.url}\n   ${excerpt}`;
      })
      .join('\n\n');

    return {
      content: `Parallel research across ${capped.length} queries — ${results.length} results:\n\n${formatted}`,
    };
  }
}
