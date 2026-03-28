import type { FastifyInstance } from 'fastify';

export default async function connectorRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    const { data, error } = await app.supabase
      .from('connectors')
      .select('*')
      .order('name', { ascending: true });

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });

  app.get<{ Params: { slug: string } }>('/:slug', async (req, reply) => {
    const { data, error } = await app.supabase
      .from('connectors')
      .select('*')
      .eq('slug', req.params.slug)
      .single();

    if (error || !data) return reply.status(404).send({ error: 'Connector not found' });
    return reply.send(data);
  });
}
