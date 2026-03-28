import type { FastifyInstance } from 'fastify';
import { CreateWorkflowSchema, UpdateWorkflowGraphSchema } from 'chorus-shared';
import { parseNlToWorkflow } from '../services/nl-parser.js';

export default async function workflowRoutes(app: FastifyInstance) {
  // List all workflows
  app.get('/', async (_req, reply) => {
    const { data, error } = await app.supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return reply.status(500).send({ error: error.message });
    return reply.send(data);
  });

  // Get single workflow with contracts
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { data: workflow, error } = await app.supabase
      .from('workflows')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !workflow) return reply.status(404).send({ error: 'Workflow not found' });

    const { data: contracts } = await app.supabase
      .from('contracts')
      .select('*')
      .eq('workflow_id', req.params.id)
      .order('sequence');

    return reply.send({ workflow, contracts: contracts ?? [] });
  });

  // Create workflow from NL prompt
  app.post<{ Body: { name: string; nl_prompt: string } }>('/', async (req, reply) => {
    const parsed = CreateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { name, nl_prompt } = parsed.data;

    // Get connector slugs for the parser
    const { data: connectorRows } = await app.supabase.from('connectors').select('slug');
    const slugs = (connectorRows ?? []).map((c: { slug: string }) => c.slug);

    let graph;
    try {
      graph = await parseNlToWorkflow(nl_prompt, slugs, app.anthropic);
    } catch (err) {
      return reply.status(422).send({ error: `Failed to parse workflow: ${String(err)}` });
    }

    const { data: workflow, error } = await app.supabase
      .from('workflows')
      .insert({ name, nl_prompt, graph_json: graph, status: 'draft' })
      .select()
      .single();

    if (error || !workflow) {
      return reply.status(500).send({ error: error?.message ?? 'Failed to create workflow' });
    }

    return reply.status(201).send({ workflow });
  });

  // Update workflow graph (manual edits)
  app.put<{ Params: { id: string }; Body: { graph_json: unknown } }>(
    '/:id',
    async (req, reply) => {
      const parsed = UpdateWorkflowGraphSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const { data: workflow, error } = await app.supabase
        .from('workflows')
        .update({ graph_json: parsed.data.graph_json, status: 'draft' })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error || !workflow) return reply.status(404).send({ error: 'Workflow not found' });
      return reply.send({ workflow });
    },
  );

  // Delete workflow
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { error } = await app.supabase
      .from('workflows')
      .delete()
      .eq('id', req.params.id);

    if (error) return reply.status(500).send({ error: error.message });
    return reply.status(204).send();
  });
}
