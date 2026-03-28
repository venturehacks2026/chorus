import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';

interface HttpInput {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

export class HttpConnector extends ConnectorBase {
  slug = 'http';
  name = 'HTTP Request';
  description = 'Make GET or POST HTTP requests to any URL and return the response body.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The full URL to request' },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'HTTP method (default: GET)',
      },
      headers: {
        type: 'object',
        description: 'Optional HTTP headers as key-value pairs',
        additionalProperties: { type: 'string' },
      },
      body: { description: 'Optional request body (will be JSON-serialized)' },
    },
    required: ['url'],
  };

  async call({ config, input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { url: inputUrl, method = 'GET', headers = {}, body } = input as HttpInput;
    const baseUrl = (config.base_url as string) ?? '';

    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${inputUrl.replace(/^\//, '')}` : inputUrl;

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetch(fullUrl, fetchOptions);
    } catch (err) {
      return { content: `Network error: ${String(err)}` };
    }

    const text = await res.text();

    // Try to pretty-print if JSON
    let content: string;
    try {
      content = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      content = text;
    }

    return {
      content: `HTTP ${method} ${fullUrl} → ${res.status}\n\n${content}`,
      metadata: { status: res.status, url: fullUrl },
    };
  }
}
