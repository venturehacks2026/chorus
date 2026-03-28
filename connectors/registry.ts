import { WebSearchConnector } from './web-search';
import { PerplexityConnector } from './perplexity';
import { HttpConnector } from './http';
import { CodeExecutorConnector } from './code-executor';
import { FileReaderConnector } from './file-reader';
import { MemoryConnector } from './memory';
import type { ConnectorBase } from './base';

export type ConnectorRegistry = Map<string, ConnectorBase>;

let registry: ConnectorRegistry | null = null;

export function getRegistry(): ConnectorRegistry {
  if (!registry) {
    const connectors: ConnectorBase[] = [
      new WebSearchConnector(),
      new PerplexityConnector(),
      new HttpConnector(),
      new CodeExecutorConnector(),
      new FileReaderConnector(),
      new MemoryConnector(),
    ];
    registry = new Map(connectors.map((c) => [c.slug, c]));
  }
  return registry;
}
