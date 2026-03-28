import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';

interface PerplexityInput {
  query: string;
}

interface PerplexityResponse {
  choices: Array<{ message: { content: string } }>;
  citations?: string[];
}

export class PerplexityConnector extends ConnectorBase {
  slug = 'perplexity';
  name = 'Perplexity Research';
  description = 'Deep research queries using Perplexity AI. Returns comprehensive, sourced answers.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'The research question or query' },
    },
    required: ['query'],
  };

  async call({ secrets, config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { query } = input as PerplexityInput;
    const apiKey = secrets.perplexity_api_key;

    if (!apiKey) {
      return { content: 'Error: perplexity_api_key not configured in Vault' };
    }

    const model = (config.model as string) ?? 'sonar-pro';

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: query }],
        return_citations: true,
      }),
    });

    if (!res.ok) {
      return { content: `Perplexity API error: ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as PerplexityResponse;
    const answer = data.choices[0]?.message.content ?? 'No response';
    const citations = data.citations ?? [];

    const citationsSection =
      citations.length > 0
        ? `\n\nSources:\n${citations.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
        : '';

    return {
      content: `${answer}${citationsSection}`,
      metadata: { model, citations },
    };
  }
}
