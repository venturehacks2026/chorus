import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

const store = new Map<string, string>();

export class MemoryConnector extends ConnectorBase {
  slug = 'memory';
  name = 'Memory Store';
  description = 'Store and retrieve key-value pairs within an execution.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      action: { type: 'string', enum: ['set', 'get', 'delete', 'list'] },
      key: { type: 'string' },
      value: { type: 'string' },
      namespace: { type: 'string' },
    },
    required: ['action'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { action, key, value, namespace = 'default' } = input as { action: string; key?: string; value?: string; namespace?: string };
    const prefix = `${namespace}:`;
    switch (action) {
      case 'set': if (!key) return { content: 'key required' }; store.set(`${prefix}${key}`, value ?? ''); return { content: `Stored "${key}"` };
      case 'get': if (!key) return { content: 'key required' }; return { content: store.get(`${prefix}${key}`) ?? `"${key}" not found` };
      case 'delete': if (!key) return { content: 'key required' }; store.delete(`${prefix}${key}`); return { content: `Deleted "${key}"` };
      case 'list': return { content: [...store.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)).join('\n') || 'empty' };
      default: return { content: `Unknown action: ${action}` };
    }
  }
}
