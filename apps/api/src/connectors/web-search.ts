import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';

interface SearchInput {
  query: string;
  count?: number;
}

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

interface BraveResponse {
  web?: { results?: BraveResult[] };
}

export class WebSearchConnector extends ConnectorBase {
  slug = 'web-search';
  name = 'Web Search';
  description = 'Search the web using Brave Search and return top results for a query.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'The search query' },
      count: { type: 'number', description: 'Number of results to return (default: 5)' },
    },
    required: ['query'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { query, count = (config.max_results as number) ?? 5 } = input as SearchInput;
    const apiKey = secrets.brave_api_key;

    if (!apiKey) {
      return { content: 'Error: brave_api_key not configured in Vault' };
    }

    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    if (!res.ok) {
      return { content: `Search API error: ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as BraveResponse;
    const results = data.web?.results ?? [];

    if (results.length === 0) {
      return { content: 'No results found.' };
    }

    const formatted = results
      .slice(0, count)
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
      .join('\n\n');

    return {
      content: `Search results for "${query}":\n\n${formatted}`,
      metadata: { query, count: results.length },
    };
  }
}
