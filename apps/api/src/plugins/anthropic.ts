import fp from 'fastify-plugin';
import Anthropic from '@anthropic-ai/sdk';

declare module 'fastify' {
  interface FastifyInstance {
    anthropic: Anthropic;
  }
}

export const anthropicPlugin = fp(async (app) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY must be set');
  }

  const anthropic = new Anthropic({ apiKey });
  app.decorate('anthropic', anthropic);
});
