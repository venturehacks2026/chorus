import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';
import { readFile } from 'node:fs/promises';

export class FileReaderConnector extends ConnectorBase {
  slug = 'file-reader';
  name = 'File Reader';
  description = 'Read text from a file path or URL.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'File path or HTTP URL' },
      max_chars: { type: 'number', description: 'Max characters to return (default 10000)' },
    },
    required: ['path'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { path, max_chars = 10000 } = input as { path: string; max_chars?: number };
    try {
      let content: string;
      if (path.startsWith('http')) {
        const res = await fetch(path);
        if (!res.ok) return { content: `HTTP error: ${res.status}` };
        content = await res.text();
      } else {
        content = (await readFile(path)).toString('utf-8');
      }
      const truncated = content.length > max_chars;
      return { content: truncated ? `${content.slice(0, max_chars)}\n[truncated]` : content };
    } catch (err) {
      return { content: `Error: ${String(err)}` };
    }
  }
}
