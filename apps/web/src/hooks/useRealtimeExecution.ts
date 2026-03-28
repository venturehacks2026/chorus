import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useExecutionStore } from '@/stores/executionStore';
import type { AgentExecution, Execution } from 'chorus-shared';

export function useRealtimeExecution(executionId: string | null) {
  const store = useExecutionStore();

  useEffect(() => {
    if (!executionId) return;

    const channel = supabase
      .channel(`execution:${executionId}`)
      // Watch agent_executions for status changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_executions',
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          const row = payload.new as AgentExecution;
          store.updateAgentStatus(row.agent_id, row.status, row.id);
        },
      )
      // Watch executions table for overall status
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'executions',
          filter: `id=eq.${executionId}`,
        },
        (payload) => {
          const row = payload.new as Execution;
          store.updateExecutionStatus(row.status);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [executionId]);
}
