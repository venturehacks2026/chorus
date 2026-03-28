import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base';

export class CodeExecutorConnector extends ConnectorBase {
  slug = 'code-executor';
  name = 'Code Executor';
  description = 'Execute JavaScript/Node.js code with access to fetch, JSON, Math, and console. Returns stdout + return value.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      code: { type: 'string', description: 'JavaScript/Node.js code to execute. Has access to: fetch, console, JSON, Math, Buffer, process.env. Use return to return a value.' },
      timeout_ms: { type: 'number', description: 'Execution timeout in ms (default 10000, max 30000)' },
    },
    required: ['code'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { code, timeout_ms = 10000 } = input as { code: string; timeout_ms?: number };
    const timeout = Math.min(timeout_ms, 30000);

    const logs: string[] = [];

    // We wrap the code in an async IIFE so agents can use await + fetch natively
    const wrapped = `(async () => { ${code} })()`;

    try {
      // Build a safe global context with real fetch and console
      const consoleProxy = {
        log:   (...a: unknown[]) => logs.push(a.map(v => typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)).join(' ')),
        error: (...a: unknown[]) => logs.push(`[error] ${a.map(String).join(' ')}`),
        warn:  (...a: unknown[]) => logs.push(`[warn] ${a.map(String).join(' ')}`),
        info:  (...a: unknown[]) => logs.push(`[info] ${a.map(String).join(' ')}`),
        table: (v: unknown) => logs.push(JSON.stringify(v, null, 2)),
      };

      // Use Function constructor so we have access to real Node globals including fetch
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

      const fn = new AsyncFunction(
        'console', 'fetch', 'JSON', 'Math', 'Buffer', 'process',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Array', 'Object',
        'String', 'Number', 'Boolean', 'Date', 'Map', 'Set', 'Promise', 'Error',
        `return ${wrapped}`,
      );

      const result = await Promise.race([
        fn(consoleProxy, globalThis.fetch, JSON, Math, Buffer, process,
          parseInt, parseFloat, isNaN, isFinite, Array, Object,
          String, Number, Boolean, Date, Map, Set, Promise, Error),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        ),
      ]);

      const parts: string[] = [];
      if (logs.length > 0) parts.push(logs.join('\n'));
      if (result !== undefined && result !== null) {
        parts.push(`→ ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
      }

      return { content: parts.join('\n').trim() || '(no output)' };
    } catch (err) {
      const errorMsg = String(err);
      const logContext = logs.length > 0 ? `\nLogs before error:\n${logs.join('\n')}` : '';
      return { content: `Error: ${errorMsg}${logContext}` };
    }
  }
}
