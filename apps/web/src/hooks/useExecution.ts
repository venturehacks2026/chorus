import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useExecution(id: string | null) {
  return useQuery({
    queryKey: ['executions', id],
    queryFn: () => api.executions.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.execution?.status;
      return status === 'running' ? 2000 : false;
    },
  });
}

export function useRunExecution() {
  return useMutation({
    mutationFn: (workflowId: string) => api.executions.run({ workflow_id: workflowId }),
  });
}

export function useExecutionSteps(executionId: string | null, agentExecutionId?: string) {
  return useQuery({
    queryKey: ['execution-steps', executionId, agentExecutionId],
    queryFn: () => api.executions.steps(executionId!, agentExecutionId),
    enabled: !!executionId,
  });
}
