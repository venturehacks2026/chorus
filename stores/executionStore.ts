import { create } from 'zustand';
import type { AgentStatus, WorkflowStatus } from '@/lib/types';

interface ExecutionStore {
  executionId: string | null;
  executionStatus: WorkflowStatus;
  agentStatuses: Record<string, AgentStatus>;
  agentExecutionIds: Record<string, string>;
  selectedAgentExecutionId: string | null;
  isRunning: boolean;

  startExecution: (executionId: string) => void;
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
};

export const useExecutionStore = create<ExecutionStore>((set) => ({
  ...initial,

  startExecution: (executionId) =>
    set({ executionId, executionStatus: 'running', isRunning: true, agentStatuses: {}, agentExecutionIds: {} }),

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
}));
