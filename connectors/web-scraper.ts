import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

/**
 * Web Scraper — fetches any public URL and returns clean, readable content.
 * No API key required. Uses Node's built-in fetch.
 *
 * Capabilities:
 *   - Extracts article text (strips nav/footer/ads via heuristics)
 *   - Extracts structured metadata: title, description, Open Graph tags
 *   - Can extract links, tables, or specific CSS-like selectors
 *   - Returns content in a format agents can directly insert into data-store
 */
export class WebScraperConnector extends ConnectorBase {
  slug = 'web-scraper';
  name = 'Web Scraper';
  description = 'Fetch and extract clean text, metadata, links, or tables from any public URL. No API key needed. Returns structured data ready for data-store insertion.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch and scrape',
      },
      mode: {
        type: 'string',
        enum: ['text', 'metadata', 'links', 'tables', 'full'],
        description: 'text: clean article text | metadata: title/description/og tags | links: all hyperlinks | tables: extract HTML tables as arrays | full: text + metadata together (default: text)',
      },
      selector_hint: {
        type: 'string',
        description: 'Optional: hint for which HTML tag to focus on, e.g. "article", "main", ".content", "h2". Helps extract more precise content.',
      },
      max_chars: {
        type: 'number',
        description: 'Max characters to return for text content (default 8000, max 40000)',
      },
    },
    required: ['url'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const {
      url,
      mode = 'text',
      selector_hint,
      max_chars = 8000,
    } = input as {
      url: string;
      mode?: string;
      selector_hint?: string;
      max_chars?: number;
    };

    const maxLen = Math.min(max_chars, 40000);

    // Fetch the page
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChorusBot/1.0; +https://chorus.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return { content: `HTTP ${res.status} from ${url}` };
      }

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        return { content: JSON.stringify(json, null, 2).slice(0, maxLen), metadata: { url, content_type: 'json' } };
      }

      html = await res.text();
    } catch (err) {
      return { content: `Fetch error: ${String(err)}` };
    }

    // ── Parse metadata ────────────────────────────────────────────────────────

    function extractMeta(html: string) {
      const get = (pattern: RegExp) => pattern.exec(html)?.[1]?.trim() ?? '';
      return {
        title: get(/<title[^>]*>([^<]{1,200})<\/title>/i)
          || get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,200})["']/i),
        description: get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,500})["']/i)
          || get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,500})["']/i),
        og_image: get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
        og_type: get(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i),
        canonical: get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
        author: get(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']{1,200})["']/i),
        published: get(/<meta[^>]+(?:name|property)=["'](?:article:published_time|datePublished)["'][^>]+content=["']([^"']+)["']/i),
        url,
      };
    }

    if (mode === 'metadata') {
      const meta = extractMeta(html);
      return {
        content: Object.entries(meta)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
        metadata: meta,
      };
    }

    // ── Extract links ─────────────────────────────────────────────────────────

    if (mode === 'links') {
      const linkRegex = /<a[^>]+href=["']([^"'#][^"']*?)["'][^>]*>([^<]{1,120})<\/a>/gi;
      const links: { url: string; text: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null && links.length < 200) {
        const href = m[1].startsWith('http') ? m[1] : new URL(m[1], url).href;
        const text = m[2].replace(/\s+/g, ' ').trim();
        if (text && href) links.push({ url: href, text });
      }
      return {
        content: links.map(l => `${l.text}\n  ${l.url}`).join('\n\n').slice(0, maxLen),
        metadata: { url, links },
      };
    }

    // ── Extract tables ────────────────────────────────────────────────────────

    if (mode === 'tables') {
      const tables: Array<{ headers: string[]; rows: string[][] }> = [];
      const tableRegex = /<table[\s\S]*?<\/table>/gi;
      let tableMatch: RegExpExecArray | null;
      while ((tableMatch = tableRegex.exec(html)) !== null && tables.length < 10) {
        const tableHtml = tableMatch[0];
        const headers: string[] = [];
        const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        let th: RegExpExecArray | null;
        while ((th = thRegex.exec(tableHtml)) !== null) {
          headers.push(stripTags(th[1]).trim());
        }
        const rows: string[][] = [];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let tr: RegExpExecArray | null;
        while ((tr = trRegex.exec(tableHtml)) !== null) {
          const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          const cells: string[] = [];
          let td: RegExpExecArray | null;
          while ((td = tdRegex.exec(tr[1])) !== null) {
            cells.push(stripTags(td[1]).trim());
          }
          if (cells.length) rows.push(cells);
        }
        if (rows.length) tables.push({ headers, rows });
      }
      const summary = tables.map((t, i) => {
        const header = t.headers.length ? t.headers.join(' | ') : t.rows[0]?.join(' | ') ?? '';
        const dataRows = t.headers.length ? t.rows : t.rows.slice(1);
        return `Table ${i + 1}:\n${header}\n${dataRows.map(r => r.join(' | ')).join('\n')}`;
      }).join('\n\n');
      return {
        content: summary.slice(0, maxLen) || 'No tables found',
        metadata: { url, table_count: tables.length, tables },
      };
    }

    // ── Extract clean text ────────────────────────────────────────────────────

    // Remove script, style, nav, footer, header, aside — noisy chrome
    let body = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // If selector_hint provided, try to narrow to that region
    if (selector_hint) {
      const tag = selector_hint.replace(/[^a-z0-9\-_]/gi, '');
      const tagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = tagRegex.exec(body);
      if (match) body = match[1];
    } else {
      // Try to find main content region
      const mainMatch = /<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i.exec(body);
      if (mainMatch) body = mainMatch[1];
    }

    const text = stripTags(body)
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    if (mode === 'full') {
      const meta = extractMeta(html);
      const metaStr = Object.entries(meta).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
      return {
        content: `--- Metadata ---\n${metaStr}\n\n--- Content ---\n${text.slice(0, maxLen)}`,
        metadata: { ...meta, text_length: text.length },
      };
    }

    return {
      content: text.slice(0, maxLen) || 'No readable content found',
      metadata: { url, text_length: text.length },
    };
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(?:h[1-6]|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ');
}
