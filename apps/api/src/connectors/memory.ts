import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';

// In-process store — keyed by execution_id for isolation
const store = new Map<string, string>();

interface MemoryInput {
  action: 'set' | 'get' | 'delete' | 'list';
  key?: string;
  value?: string;
  namespace?: string;
}

export class MemoryConnector extends ConnectorBase {
  slug = 'memory';
  name = 'Memory Store';
  description =
    'Store and retrieve key-value pairs within a workflow execution. Useful for passing structured data between agents.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['set', 'get', 'delete', 'list'],
        description: 'Action to perform',
      },
      key: { type: 'string', description: 'Key to store/retrieve (required for set/get/delete)' },
      value: { type: 'string', description: 'Value to store (required for set)' },
      namespace: { type: 'string', description: 'Optional namespace prefix for keys' },
    },
    required: ['action'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { action, key, value, namespace = 'default' } = input as MemoryInput;
    const prefix = `${namespace}:`;

    switch (action) {
      case 'set': {
        if (!key) return { content: 'Error: key is required for set' };
        if (value === undefined) return { content: 'Error: value is required for set' };
        store.set(`${prefix}${key}`, value);
        return { content: `Stored key "${key}"` };
      }

      case 'get': {
        if (!key) return { content: 'Error: key is required for get' };
        const val = store.get(`${prefix}${key}`);
        return { content: val !== undefined ? val : `Key "${key}" not found` };
      }

      case 'delete': {
        if (!key) return { content: 'Error: key is required for delete' };
        store.delete(`${prefix}${key}`);
        return { content: `Deleted key "${key}"` };
      }

      case 'list': {
        const keys = [...store.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length));
        return {
          content: keys.length > 0 ? `Keys in "${namespace}":\n${keys.join('\n')}` : `No keys in namespace "${namespace}"`,
        };
      }

      default:
        return { content: `Unknown action: ${action as string}` };
    }
  }
}
