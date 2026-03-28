import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentStatus, WorkflowStatus } from '@/lib/types';

interface ExecutionStore {
  executionId: string | null;
  executionStatus: WorkflowStatus;
  agentStatuses: Record<string, AgentStatus>;
  agentExecutionIds: Record<string, string>;
  selectedAgentExecutionId: string | null;
  isRunning: boolean;
  // The workflow this execution belongs to — used for rehydration
  executionWorkflowId: string | null;

  startExecution: (executionId: string, workflowId?: string) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus, execId?: string) => void;
  updateExecutionStatus: (status: WorkflowStatus) => void;
  selectAgentExecution: (id: string | null) => void;
  reset: () => void;
}

const initial = {
  executionId: null,
  executionStatus: 'draft' as WorkflowStatus,
  agentStatuses: {},
  agentExecutionIds: {},
  selectedAgentExecutionId: null,
  isRunning: false,
  executionWorkflowId: null,
};

export const useExecutionStore = create<ExecutionStore>()(
  persist(
    (set) => ({
      ...initial,

      startExecution: (executionId, workflowId) =>
        set({
          executionId,
          executionStatus: 'running',
          isRunning: true,
          agentStatuses: {},
          agentExecutionIds: {},
          executionWorkflowId: workflowId ?? null,
        }),

      updateAgentStatus: (agentId, status, execId) =>
        set((s) => ({
          agentStatuses: { ...s.agentStatuses, [agentId]: status },
          agentExecutionIds: execId ? { ...s.agentExecutionIds, [agentId]: execId } : s.agentExecutionIds,
          selectedAgentExecutionId:
            status === 'running' && execId ? execId : s.selectedAgentExecutionId,
        })),

      updateExecutionStatus: (status) =>
        set({ executionStatus: status, isRunning: status === 'running' }),

      selectAgentExecution: (id) => set({ selectedAgentExecutionId: id }),

      reset: () => set(initial),
    }),
    {
      name: 'chorus-execution',
      // Only persist the IDs and statuses — not UI-only state
      partialize: (s) => ({
        executionId: s.executionId,
        executionStatus: s.executionStatus,
        agentStatuses: s.agentStatuses,
        agentExecutionIds: s.agentExecutionIds,
        executionWorkflowId: s.executionWorkflowId,
        isRunning: s.isRunning,
      }),
    }
  )
);
