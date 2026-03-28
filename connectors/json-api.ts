import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

/**
 * JSON API Connector — fetch any JSON endpoint and extract specific fields.
 * Supports GET/POST, optional auth headers, and dot-path field extraction.
 * No configuration required for public APIs.
 */
export class JsonApiConnector extends ConnectorBase {
  slug = 'json-api';
  name = 'JSON API';
  description = 'Fetch any public or authenticated JSON REST API endpoint. Supports GET/POST, custom headers, bearer tokens, and dot-path field extraction (e.g. "results.0.title"). Returns structured data ready for data-store.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'Full URL of the JSON API endpoint',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'PATCH'],
        description: 'HTTP method (default: GET)',
      },
      headers: {
        type: 'object',
        description: 'Additional request headers as key-value pairs',
      },
      body: {
        description: 'Request body for POST/PUT (sent as JSON)',
      },
      bearer_token: {
        type: 'string',
        description: 'Optional Bearer token for Authorization header',
      },
      extract_path: {
        type: 'string',
        description: 'Dot-path to extract from the response JSON (e.g. "data.items" or "results"). If omitted, returns the full response.',
      },
      extract_fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'If response is an array of objects, pick only these fields from each item',
      },
      limit: {
        type: 'number',
        description: 'Max number of array items to return (default 20)',
      },
    },
    required: ['url'],
  };

  async call({ input, secrets }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const {
      url,
      method = 'GET',
      headers: extraHeaders = {},
      body: reqBody,
      bearer_token,
      extract_path,
      extract_fields,
      limit = 20,
    } = input as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      bearer_token?: string;
      extract_path?: string;
      extract_fields?: string[];
      limit?: number;
    };

    // Bearer token from input or secrets
    const token = bearer_token
      || (secrets as Record<string, string>).bearer_token
      || (secrets as Record<string, string>).api_key;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'ChorusBot/1.0',
      ...extraHeaders,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let json: unknown;
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: reqBody && method !== 'GET' ? JSON.stringify(reqBody) : undefined,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { content: `HTTP ${res.status} from ${url}:\n${errText.slice(0, 500)}` };
      }

      json = await res.json();
    } catch (err) {
      return { content: `Request error: ${String(err)}` };
    }

    // ── Extract by path ───────────────────────────────────────────────────────

    if (extract_path) {
      const parts = extract_path.split('.');
      let cur: unknown = json;
      for (const part of parts) {
        if (cur === null || cur === undefined) break;
        if (Array.isArray(cur)) {
          const idx = parseInt(part, 10);
          cur = isNaN(idx) ? undefined : cur[idx];
        } else if (typeof cur === 'object') {
          cur = (cur as Record<string, unknown>)[part];
        } else {
          cur = undefined;
          break;
        }
      }
      json = cur;
    }

    // ── If array, trim and optionally pick fields ─────────────────────────────

    let items: unknown[] | null = null;
    if (Array.isArray(json)) {
      items = json.slice(0, limit);
      if (extract_fields?.length) {
        items = items.map(item => {
          if (typeof item !== 'object' || item === null) return { value: item };
          return Object.fromEntries(
            extract_fields.map(f => [f, (item as Record<string, unknown>)[f]])
              .filter(([, v]) => v !== undefined)
          );
        });
      }
      json = items;
    }

    const jsonStr = JSON.stringify(json, null, 2);

    // Build human-readable summary
    let summary = '';
    if (items) {
      summary = `${items.length} items from ${url}:\n\n` +
        items.slice(0, 5).map((it, i) => `${i + 1}. ${JSON.stringify(it).slice(0, 200)}`).join('\n') +
        (items.length > 5 ? `\n…and ${items.length - 5} more` : '');
    } else {
      summary = `Response from ${url}:\n${jsonStr.slice(0, 3000)}`;
    }

    return {
      content: summary,
      metadata: {
        url,
        status: 'ok',
        item_count: items?.length ?? null,
        data: json,
      },
    };
  }
}
