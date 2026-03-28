import Fastify from 'fastify';
import cors from '@fastify/cors';
import { supabasePlugin } from './plugins/supabase.js';
import { vaultPlugin } from './plugins/vault.js';
import { anthropicPlugin } from './plugins/anthropic.js';
import { connectorPlugin } from './plugins/connectors.js';
import workflowRoutes from './routes/workflows.js';
import executionRoutes from './routes/executions.js';
import connectorRoutes from './routes/connectors.js';
import contractRoutes from './routes/contracts.js';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
});

await app.register(supabasePlugin);
await app.register(vaultPlugin);
await app.register(anthropicPlugin);
await app.register(connectorPlugin);

await app.register(workflowRoutes, { prefix: '/api/workflows' });
await app.register(executionRoutes, { prefix: '/api/executions' });
await app.register(connectorRoutes, { prefix: '/api/connectors' });
await app.register(contractRoutes, { prefix: '/api/contracts' });

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

const port = Number(process.env.PORT ?? 4000);

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Chorus API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
