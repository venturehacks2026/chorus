import fp from 'fastify-plugin';
import { VaultClient } from '../services/vault-client.js';

declare module 'fastify' {
  interface FastifyInstance {
    vault: VaultClient;
  }
}

export const vaultPlugin = fp(async (app) => {
  const addr = process.env.VAULT_ADDR ?? 'http://127.0.0.1:8200';
  const token = process.env.VAULT_TOKEN ?? '';

  const vault = new VaultClient(addr, token);
  app.decorate('vault', vault);
});
