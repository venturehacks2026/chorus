import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentStatus, WorkflowStatus } from '@/lib/types';

export interface ContractShieldState {
  status: 'checking' | 'pass' | 'fail' | 'retrying';
  lastResult?: string;
  retryCount?: number;
}

interface RetryEdge {
  id: string;
  shieldId: string;
  targetAgentId: string;
}

interface ExecutionStore {
  executionId: string | null;
  executionStatus: WorkflowStatus;
  agentStatuses: Record<string, AgentStatus>;
  agentExecutionIds: Record<string, string>;
  selectedAgentExecutionId: string | null;
  isRunning: boolean;
  contractShields: Record<string, ContractShieldState>;
  retryEdges: Record<string, RetryEdge>;
  executionWorkflowId: string | null;

  startExecution: (executionId: string, workflowId?: string) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus, execId?: string) => void;
  updateExecutionStatus: (status: WorkflowStatus) => void;
  selectAgentExecution: (id: string | null) => void;
  setContractShield: (shieldId: string, state: ContractShieldState) => void;
  clearContractShields: () => void;
  addRetryEdge: (shieldId: string, sourceAgentId: string) => void;
  removeRetryEdge: (shieldId: string) => void;
  reset: () => void;
}

const initial = {
  executionId: null,
  executionStatus: 'draft' as WorkflowStatus,
  agentStatuses: {},
  agentExecutionIds: {},
  selectedAgentExecutionId: null,
  isRunning: false,
  contractShields: {},
  retryEdges: {},
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
          contractShields: {},
          retryEdges: {},
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

      setContractShield: (shieldId, state) =>
        set((s) => ({ contractShields: { ...s.contractShields, [shieldId]: state } })),

      clearContractShields: () => set({ contractShields: {}, retryEdges: {} }),

      addRetryEdge: (shieldId, sourceAgentId) =>
        set((s) => ({
          retryEdges: {
            ...s.retryEdges,
            [shieldId]: {
              id: `retry-${shieldId}`,
              shieldId,
              targetAgentId: sourceAgentId,
            },
          },
        })),

      removeRetryEdge: (shieldId) =>
        set((s) => {
          const next = { ...s.retryEdges };
          delete next[shieldId];
          return { retryEdges: next };
        }),

      reset: () => set(initial),
    }),
    {
      name: 'chorus-execution',
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
