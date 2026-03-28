import { create } from 'zustand';
import type { AgentStatus, WorkflowStatus } from 'chorus-shared';

interface ExecutionStore {
  executionId: string | null;
  executionStatus: WorkflowStatus;
  agentStatuses: Record<string, AgentStatus>;
  agentExecutionIds: Record<string, string>; // agentId → agentExecutionId
  selectedAgentExecutionId: string | null;
  isRunning: boolean;

  startExecution: (executionId: string) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus, agentExecutionId?: string) => void;
  updateExecutionStatus: (status: WorkflowStatus) => void;
  selectAgentExecution: (agentExecutionId: string | null) => void;
  reset: () => void;
}

const initialState = {
  executionId: null,
  executionStatus: 'draft' as WorkflowStatus,
  agentStatuses: {},
  agentExecutionIds: {},
  selectedAgentExecutionId: null,
  isRunning: false,
};

export const useExecutionStore = create<ExecutionStore>((set) => ({
  ...initialState,

  startExecution: (executionId) =>
    set({ executionId, executionStatus: 'running', isRunning: true, agentStatuses: {}, agentExecutionIds: {} }),

  updateAgentStatus: (agentId, status, agentExecutionId) =>
    set((state) => ({
      agentStatuses: { ...state.agentStatuses, [agentId]: status },
      agentExecutionIds: agentExecutionId
        ? { ...state.agentExecutionIds, [agentId]: agentExecutionId }
        : state.agentExecutionIds,
      // Auto-select the running agent's execution panel
      selectedAgentExecutionId:
        status === 'running' && agentExecutionId
          ? agentExecutionId
          : state.selectedAgentExecutionId,
    })),

  updateExecutionStatus: (status) =>
    set({ executionStatus: status, isRunning: status === 'running' }),

  selectAgentExecution: (agentExecutionId) =>
    set({ selectedAgentExecutionId: agentExecutionId }),

  reset: () => set(initialState),
}));
