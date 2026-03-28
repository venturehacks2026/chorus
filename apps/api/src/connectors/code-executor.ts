import { ConnectorBase, type ConnectorCallInput, type ConnectorCallOutput } from './base.js';
import { createContext, Script } from 'node:vm';

interface CodeInput {
  code: string;
  language?: 'javascript' | 'python';
}

export class CodeExecutorConnector extends ConnectorBase {
  slug = 'code-executor';
  name = 'Code Executor';
  description =
    'Execute JavaScript code snippets in a sandboxed environment and return the output.';

  inputSchema = {
    type: 'object' as const,
    properties: {
      code: { type: 'string', description: 'The code to execute' },
      language: {
        type: 'string',
        enum: ['javascript'],
        description: 'Programming language (currently only javascript is supported)',
      },
    },
    required: ['code'],
  };

  async call({ input }: ConnectorCallInput): Promise<ConnectorCallOutput> {
    const { code, language = 'javascript' } = input as CodeInput;

    if (language !== 'javascript') {
      return { content: 'Error: Only JavaScript is currently supported' };
    }

    const logs: string[] = [];
    const errors: string[] = [];

    const sandbox = {
      console: {
        log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
        error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
        warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
        info: (...args: unknown[]) => logs.push(`[info] ${args.map(String).join(' ')}`),
      },
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    createContext(sandbox);

    try {
      const script = new Script(code);
      const result = script.runInContext(sandbox, { timeout: 5000 });

      const output = [
        ...logs,
        ...(errors.length > 0 ? [`Errors:\n${errors.join('\n')}`] : []),
        ...(result !== undefined ? [`Return value: ${JSON.stringify(result, null, 2)}`] : []),
      ].join('\n');

      return {
        content: output || 'Code executed successfully (no output)',
        metadata: { logs, errors },
      };
    } catch (err) {
      return {
        content: `Execution error: ${String(err)}`,
        metadata: { error: String(err) },
      };
    }
  }
}
