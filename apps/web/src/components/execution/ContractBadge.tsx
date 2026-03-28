import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ContractResultRecord } from 'chorus-shared';
import { cn } from '@/lib/cn';

interface Props {
  agentExecutionId: string | null;
}

export default function ContractBadge({ agentExecutionId }: Props) {
  const [results, setResults] = useState<ContractResultRecord[]>([]);

  useEffect(() => {
    if (!agentExecutionId) {
      setResults([]);
      return;
    }

    // Initial fetch
    supabase
      .from('contract_results')
      .select('*')
      .eq('agent_execution_id', agentExecutionId)
      .then(({ data }) => setResults(data ?? []));

    // Subscribe
    const channel = supabase
      .channel(`contracts:${agentExecutionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_results',
          filter: `agent_execution_id=eq.${agentExecutionId}`,
        },
        (payload) => {
          setResults((prev) => [...prev, payload.new as ContractResultRecord]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentExecutionId]);

  if (results.length === 0) return null;

  return (
    <div className="mt-3 border-t border-node-border pt-3">
      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Contracts</p>
      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div
            key={r.id}
            className={cn(
              'flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs',
              r.result === 'pass' ? 'bg-emerald-500/10 border border-emerald-500/20' :
              r.result === 'fail' ? 'bg-red-500/10 border border-red-500/20' :
              'bg-gray-500/10 border border-gray-500/20',
            )}
          >
            {r.result === 'pass' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {r.result === 'fail' && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />}
            {r.result === 'skip' && <Minus className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={cn(
                'font-medium',
                r.result === 'pass' ? 'text-emerald-300' :
                r.result === 'fail' ? 'text-red-300' : 'text-gray-400',
              )}>
                {r.result.toUpperCase()}
              </p>
              <p className="text-gray-400 mt-0.5">{r.judge_reasoning}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
