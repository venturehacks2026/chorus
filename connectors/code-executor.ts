import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';
import { createContext, Script } from 'node:vm';

export class CodeExecutorConnector extends ConnectorBase {
  slug = 'code-executor';
  name = 'Code Executor';
  description = 'Execute JavaScript in a sandboxed environment.';
  inputSchema = {
    type: 'object' as const,
    properties: { code: { type: 'string', description: 'JavaScript code to execute' } },
    required: ['code'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { code } = input as { code: string };
    const logs: string[] = [];
    const sandbox = {
      console: { log: (...a: unknown[]) => logs.push(a.map(String).join(' ')), error: (...a: unknown[]) => logs.push(`[err] ${a.map(String).join(' ')}`), warn: (...a: unknown[]) => logs.push(`[warn] ${a.map(String).join(' ')}`) },
      Math, JSON, Array, Object, String, Number, Boolean, Date, parseInt, parseFloat, isNaN, isFinite,
    };
    createContext(sandbox);
    try {
      const result = new Script(code).runInContext(sandbox, { timeout: 5000 });
      const output = [...logs, ...(result !== undefined ? [`→ ${JSON.stringify(result)}`] : [])].join('\n');
      return { content: output || '(no output)' };
    } catch (err) {
      return { content: `Error: ${String(err)}` };
    }
  }
}
