import type { FastifyInstance } from 'fastify';
import { CreateContractSchema, UpdateContractSchema } from 'chorus-shared';

export default async function contractRoutes(app: FastifyInstance) {
  // List contracts (filtered by workflow_id and/or agent_id)
  app.get<{ Querystring: { workflow_id?: string; agent_id?: string } }>(
    '/',
    async (req, reply) => {
      let query = app.supabase.from('contracts').select('*').order('sequence');

      if (req.query.workflow_id) {
        query = query.eq('workflow_id', req.query.workflow_id);
      }
      if (req.query.agent_id) {
        query = query.eq('agent_id', req.query.agent_id);
      }

      const { data, error } = await query;
      if (error) return reply.status(500).send({ error: error.message });
      return reply.send(data ?? []);
    },
  );

  // Create contract
  app.post('/', async (req, reply) => {
    const parsed = CreateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { data, error } = await app.supabase
      .from('contracts')
      .insert(parsed.data)
      .select()
      .single();

    if (error || !data) {
      return reply.status(500).send({ error: error?.message ?? 'Failed to create contract' });
    }

    return reply.status(201).send(data);
  });

  // Update contract
  app.put<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const parsed = UpdateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { data, error } = await app.supabase
      .from('contracts')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return reply.status(404).send({ error: 'Contract not found' });
    return reply.send(data);
  });

  // Delete contract
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { error } = await app.supabase.from('contracts').delete().eq('id', req.params.id);
    if (error) return reply.status(500).send({ error: error.message });
    return reply.status(204).send();
  });
}
