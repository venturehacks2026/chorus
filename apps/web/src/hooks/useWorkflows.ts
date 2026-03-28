import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateWorkflowRequest, WorkflowGraph } from 'chorus-shared';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.workflows.list(),
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => api.workflows.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkflowRequest) => api.workflows.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (graph: WorkflowGraph) => api.workflows.update(id, graph),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows', id] }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.workflows.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });
}
