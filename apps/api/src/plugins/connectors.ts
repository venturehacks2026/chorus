import fp from 'fastify-plugin';
import { buildRegistry, type ConnectorRegistry } from '../connectors/registry.js';

declare module 'fastify' {
  interface FastifyInstance {
    connectors: ConnectorRegistry;
  }
}

export const connectorPlugin = fp(async (app) => {
  app.decorate('connectors', buildRegistry());
});
