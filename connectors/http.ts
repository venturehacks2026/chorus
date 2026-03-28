import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

export class HttpConnector extends ConnectorBase {
  slug = 'http';
  name = 'HTTP Request';
  description = 'Make HTTP requests to any URL.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'URL to request' },
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: { description: 'Request body' },
    },
    required: ['url'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { url, method = 'GET', headers = {}, body } = input as { url: string; method?: string; headers?: Record<string, string>; body?: unknown };
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let content: string;
      try { content = JSON.stringify(JSON.parse(text), null, 2); } catch { content = text; }
      return { content: `${method} ${url} → ${res.status}\n\n${content}` };
    } catch (err) {
      return { content: `Network error: ${String(err)}` };
    }
  }
}
