import type { FastifyInstance } from 'fastify';
import { RunExecutionSchema } from 'chorus-shared';
import { runWorkflow } from '../services/orchestrator.js';

export default async function executionRoutes(app: FastifyInstance) {
  // Start a workflow execution (async — returns immediately)
  app.post<{ Body: { workflow_id: string } }>('/run', async (req, reply) => {
    const parsed = RunExecutionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const { workflow_id } = parsed.data;

    // Verify workflow exists
    const { data: workflow } = await app.supabase
      .from('workflows')
      .select('id, status')
      .eq('id', workflow_id)
      .single();

    if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });
    if (workflow.status === 'running') {
      return reply.status(409).send({ error: 'Workflow is already running' });
    }

    // Launch orchestrator as a detached async task
    const deps = {
      supabase: app.supabase,
      anthropic: app.anthropic,
      vault: app.vault,
      connectors: app.connectors,
    };

    // Fire-and-forget — execution_id resolved via DB
    let executionId = '';
    runWorkflow(workflow_id, deps)
      .then((id) => {
        executionId = id;
        app.log.info(`Execution ${id} completed for workflow ${workflow_id}`);
      })
      .catch((err) => {
        app.log.error({ err }, `Execution failed for workflow ${workflow_id}`);
      });

    // Small wait to capture the execution_id before responding
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Fetch the just-created execution record
    const { data: execution } = await app.supabase
      .from('executions')
      .select('id')
      .eq('workflow_id', workflow_id)
      .order('triggered_at', { ascending: false })
      .limit(1)
      .single();

    return reply.status(202).send({ execution_id: execution?.id ?? executionId });
  });

  // Get execution state + agent_executions
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { data: execution, error } = await app.supabase
      .from('executions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !execution) return reply.status(404).send({ error: 'Execution not found' });

    const { data: agentExecutions } = await app.supabase
      .from('agent_executions')
      .select('*')
      .eq('execution_id', req.params.id)
      .order('started_at', { ascending: true });

    return reply.send({ execution, agent_executions: agentExecutions ?? [] });
  });

  // Get execution steps for a specific agent_execution
  app.get<{ Params: { id: string }; Querystring: { agent_execution_id?: string } }>(
    '/:id/steps',
    async (req, reply) => {
      const { agent_execution_id } = req.query;

      let query = app.supabase
        .from('execution_steps')
        .select('*')
        .order('sequence', { ascending: true });

      if (agent_execution_id) {
        query = query.eq('agent_execution_id', agent_execution_id);
      } else {
        // Join via agent_executions to filter by execution_id
        const { data: agentExecs } = await app.supabase
          .from('agent_executions')
          .select('id')
          .eq('execution_id', req.params.id);

        const ids = (agentExecs ?? []).map((ae: { id: string }) => ae.id);
        if (ids.length === 0) return reply.send([]);
        query = query.in('agent_execution_id', ids);
      }

      const { data: steps, error } = await query;
      if (error) return reply.status(500).send({ error: error.message });
      return reply.send(steps ?? []);
    },
  );
}
