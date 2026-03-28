import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

export class WebSearchConnector extends ConnectorBase {
  slug = 'web-search';
  name = 'Web Search';
  description = 'Search the web using Brave Search API.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query' },
      count: { type: 'number', description: 'Number of results (default 5)' },
    },
    required: ['query'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { query, count = (config.max_results as number) ?? 5 } = input as { query: string; count?: number };
    const apiKey = secrets.brave_api_key ?? secrets.BRAVE_API_KEY;
    if (!apiKey) return { content: 'Error: brave_api_key not set in environment' };

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
      { headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey } },
    );
    if (!res.ok) return { content: `Brave Search error: ${res.status}` };

    const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    const results = data.web?.results ?? [];
    if (!results.length) return { content: 'No results found.' };

    return {
      content: results
        .slice(0, count)
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
        .join('\n\n'),
    };
  }
}
