import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

export class PerplexityConnector extends ConnectorBase {
  slug = 'perplexity';
  name = 'Perplexity Research';
  description = 'Deep research queries via Perplexity AI.';
  inputSchema = {
    type: 'object' as const,
    properties: { query: { type: 'string', description: 'Research question' } },
    required: ['query'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { query } = input as { query: string };
    const apiKey = secrets.perplexity_api_key ?? secrets.PERPLEXITY_API_KEY;
    if (!apiKey) return { content: 'Error: perplexity_api_key not set in environment' };

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: (config.model as string) ?? 'sonar-pro',
        messages: [{ role: 'user', content: query }],
        return_citations: true,
      }),
    });
    if (!res.ok) return { content: `Perplexity error: ${res.status}` };

    const data = await res.json() as { choices: Array<{ message: { content: string } }>; citations?: string[] };
    const answer = data.choices[0]?.message.content ?? 'No response';
    const citations = (data.citations ?? []).map((c, i) => `${i + 1}. ${c}`).join('\n');

    return { content: citations ? `${answer}\n\nSources:\n${citations}` : answer };
  }
}
