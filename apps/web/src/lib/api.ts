import type {
  Workflow,
  Contract,
  Connector,
  Execution,
  AgentExecution,
  ExecutionStep,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  RunExecutionRequest,
  RunExecutionResponse,
  GetExecutionResponse,
  CreateContractRequest,
  WorkflowGraph,
} from 'chorus-shared';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as { error: string };
    throw new Error(err.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export const api = {
  workflows: {
    list: () => request<Workflow[]>('/api/workflows'),

    get: (id: string) =>
      request<{ workflow: Workflow; contracts: Contract[] }>(`/api/workflows/${id}`),

    create: (body: CreateWorkflowRequest) =>
      request<CreateWorkflowResponse>('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (id: string, graph_json: WorkflowGraph) =>
      request<{ workflow: Workflow }>(`/api/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ graph_json }),
      }),

    delete: (id: string) => request<void>(`/api/workflows/${id}`, { method: 'DELETE' }),
  },

  executions: {
    run: (body: RunExecutionRequest) =>
      request<RunExecutionResponse>('/api/executions/run', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    get: (id: string) => request<GetExecutionResponse>(`/api/executions/${id}`),

    steps: (executionId: string, agentExecutionId?: string) => {
      const qs = agentExecutionId ? `?agent_execution_id=${agentExecutionId}` : '';
      return request<ExecutionStep[]>(`/api/executions/${executionId}/steps${qs}`);
    },
  },

  connectors: {
    list: () => request<Connector[]>('/api/connectors'),
    get: (slug: string) => request<Connector>(`/api/connectors/${slug}`),
  },

  contracts: {
    list: (workflowId: string, agentId?: string) => {
      const qs = agentId
        ? `?workflow_id=${workflowId}&agent_id=${agentId}`
        : `?workflow_id=${workflowId}`;
      return request<Contract[]>(`/api/contracts${qs}`);
    },

    create: (body: CreateContractRequest) =>
      request<Contract>('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (id: string, body: Partial<Contract>) =>
      request<Contract>(`/api/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    delete: (id: string) => request<void>(`/api/contracts/${id}`, { method: 'DELETE' }),
  },
};
