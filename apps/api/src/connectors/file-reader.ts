import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';
import { readFile } from 'node:fs/promises';

interface FileInput {
  path: string;
  encoding?: 'utf-8' | 'base64';
  max_chars?: number;
}

export class FileReaderConnector extends ConnectorBase {
  slug = 'file-reader';
  name = 'File Reader';
  description = 'Read text content from a local file path or a public URL.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      path: {
        type: 'string',
        description: 'Local file path or a public HTTP/HTTPS URL',
      },
      max_chars: {
        type: 'number',
        description: 'Maximum characters to return (default: 10000)',
      },
    },
    required: ['path'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { path, max_chars = 10000 } = input as FileInput;

    let content: string;

    try {
      if (path.startsWith('http://') || path.startsWith('https://')) {
        const res = await fetch(path);
        if (!res.ok) {
          return { content: `Error fetching URL: ${res.status} ${res.statusText}` };
        }
        content = await res.text();
      } else {
        const buffer = await readFile(path);
        content = buffer.toString('utf-8');
      }
    } catch (err) {
      return { content: `Error reading file: ${String(err)}` };
    }

    const truncated = content.length > max_chars;
    const output = content.slice(0, max_chars);

    return {
      content: truncated ? `${output}\n\n[Content truncated at ${max_chars} characters]` : output,
      metadata: { path, length: content.length, truncated },
    };
  }
}
