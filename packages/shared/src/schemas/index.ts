import { z } from 'zod';

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nl_prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
});

export const UpdateWorkflowGraphSchema = z.object({
  graph_json: z.object({
    agents: z.array(z.any()),
    edges: z.array(z.any()),
  }),
});

export const RunExecutionSchema = z.object({
  workflow_id: z.string().uuid(),
});

export const CreateContractSchema = z.object({
  workflow_id: z.string().uuid(),
  agent_id: z.string().min(1),
  description: z.string().min(1),
  judge_prompt: z.string().min(10),
  sequence: z.number().int().min(0).default(0),
  blocking: z.boolean().default(false),
});

export const UpdateContractSchema = CreateContractSchema.partial().omit({
  workflow_id: true,
  agent_id: true,
});
