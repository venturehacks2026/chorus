import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { ExecutionStep } from 'chorus-shared';

export function useRealtimeSteps(
  agentExecutionId: string | null,
  executionId: string | null,
): ExecutionStep[] {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);

  useEffect(() => {
    if (!agentExecutionId || !executionId) {
      setSteps([]);
      return;
    }

    setSteps([]);

    // Initial fetch of existing steps
    api.executions.steps(executionId, agentExecutionId).then((data) => {
      setSteps(data);
    });

    // Subscribe to new steps
    const channel = supabase
      .channel(`steps:${agentExecutionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_steps',
          filter: `agent_execution_id=eq.${agentExecutionId}`,
        },
        (payload) => {
          setSteps((prev) => [...prev, payload.new as ExecutionStep]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentExecutionId, executionId]);

  return steps;
}
