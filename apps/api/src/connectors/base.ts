import type Anthropic from '@anthropic-ai/sdk';

export interface ConnectorCallInput {
  config: Record<string, unknown>;
  secrets: Record<string, string>;
  input: unknown;
}

export interface ConnectorCallOutput {
  content: string;
  metadata?: Record<string, unknown>;
}

export abstract class ConnectorBase {
  abstract slug: string;
  abstract name: string;
  abstract description: string;
  abstract inputSchema: Anthropic.Tool['input_schema'];

  abstract call(input: ConnectorCallInput): Promise<ConnectorCallOutput>;

  toAnthropicTool(): Anthropic.Tool {
    return {
      name: this.slug,
      description: this.description,
      input_schema: this.inputSchema,
    };
  }
}
