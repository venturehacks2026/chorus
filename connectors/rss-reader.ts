import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

/**
 * RSS/Atom Reader — fetches any RSS or Atom feed and returns structured items.
 * No API key required. Returns data ready for direct insertion into data-store.
 */
export class RssReaderConnector extends ConnectorBase {
  slug = 'rss-reader';
  name = 'RSS / Atom Reader';
  description = 'Fetch and parse any RSS or Atom feed. Returns structured items (title, link, description, published, author) ready for data-store insertion. No API key needed.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'URL of the RSS or Atom feed (e.g. https://hnrss.org/frontpage, https://feeds.reuters.com/reuters/topNews)',
      },
      limit: {
        type: 'number',
        description: 'Max number of feed items to return (default 10, max 50)',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Which fields to include per item. Options: title, link, description, published, author, category. Default: all.',
      },
    },
    required: ['url'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const {
      url,
      limit = 10,
      fields,
    } = input as {
      url: string;
      limit?: number;
      fields?: string[];
    };

    const maxItems = Math.min(limit, 50);

    let xml: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChorusBot/1.0)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { content: `HTTP ${res.status} fetching feed: ${url}` };
      xml = await res.text();
    } catch (err) {
      return { content: `Fetch error: ${String(err)}` };
    }

    // ── Detect format (RSS vs Atom) ───────────────────────────────────────────

    const isAtom = /<feed/i.test(xml);
    const items: Array<Record<string, string>> = [];

    if (isAtom) {
      // Parse Atom
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
      let match: RegExpExecArray | null;
      while ((match = entryRegex.exec(xml)) !== null && items.length < maxItems) {
        const e = match[1];
        const item: Record<string, string> = {};
        item.title = xmlText(e, 'title');
        item.link = xmlAttr(e, 'link', 'href') || xmlText(e, 'link');
        item.description = xmlText(e, 'summary') || xmlText(e, 'content') || '';
        item.published = xmlText(e, 'published') || xmlText(e, 'updated') || '';
        item.author = xmlText(e, 'name') || xmlText(e, 'author') || '';
        item.category = xmlText(e, 'category') || '';
        items.push(filterFields(item, fields));
      }
    } else {
      // Parse RSS 2.0 / RSS 1.0
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
        const e = match[1];
        const item: Record<string, string> = {};
        item.title = xmlText(e, 'title');
        item.link = xmlText(e, 'link') || xmlAttr(e, 'guid', 'href') || xmlText(e, 'guid');
        item.description = stripXmlTags(xmlText(e, 'description') || xmlText(e, 'content:encoded') || '');
        item.published = xmlText(e, 'pubDate') || xmlText(e, 'dc:date') || '';
        item.author = xmlText(e, 'author') || xmlText(e, 'dc:creator') || '';
        item.category = xmlText(e, 'category') || '';
        items.push(filterFields(item, fields));
      }
    }

    if (!items.length) {
      return { content: `No feed items found at ${url}. The feed may be empty or use an unsupported format.` };
    }

    // Build human-readable summary + structured metadata for data-store
    const summary = items
      .map((it, i) =>
        `${i + 1}. ${it.title ?? '(no title)'}` +
        (it.published ? `\n   Published: ${it.published}` : '') +
        (it.author ? `\n   Author: ${it.author}` : '') +
        (it.link ? `\n   Link: ${it.link}` : '') +
        (it.description ? `\n   ${it.description.slice(0, 200).replace(/\n/g, ' ')}…` : '')
      )
      .join('\n\n');

    return {
      content: `Feed: ${url}\n${items.length} items retrieved\n\n${summary}`,
      metadata: { url, item_count: items.length, items },
    };
  }
}

// ── XML helpers ───────────────────────────────────────────────────────────────

function xmlText(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`<${escaped}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${escaped}>`, 'i').exec(xml)
    ?? new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i').exec(xml);
  return m ? m[1].trim() : '';
}

function xmlAttr(xml: string, tag: string, attr: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`<${escaped}[^>]*${escapedAttr}=["']([^"']+)["']`, 'i').exec(xml);
  return m ? m[1].trim() : '';
}

function stripXmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function filterFields(item: Record<string, string>, fields?: string[]): Record<string, string> {
  if (!fields?.length) {
    // Remove empty fields
    return Object.fromEntries(Object.entries(item).filter(([, v]) => v));
  }
  return Object.fromEntries(fields.map(f => [f, item[f] ?? '']).filter(([, v]) => v));
}
