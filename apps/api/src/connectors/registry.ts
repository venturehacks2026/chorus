import { WebSearchConnector } from './web-search.js';
import { PerplexityConnector } from './perplexity.js';
import { HttpConnector } from './http.js';
import { CodeExecutorConnector } from './code-executor.js';
import { FileReaderConnector } from './file-reader.js';
import { MemoryConnector } from './memory.js';
import type { ConnectorBase } from './base.js';

export type ConnectorRegistry = Map<string, ConnectorBase>;

export function buildRegistry(): ConnectorRegistry {
  const connectors: ConnectorBase[] = [
    new WebSearchConnector(),
    new PerplexityConnector(),
    new HttpConnector(),
    new CodeExecutorConnector(),
    new FileReaderConnector(),
    new MemoryConnector(),
  ];

  return new Map(connectors.map((c) => [c.slug, c]));
}
