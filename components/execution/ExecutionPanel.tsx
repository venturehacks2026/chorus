'use client';

import { useEffect, useState } from 'react';
import { X, Bot, Loader2, CheckCircle, XCircle, Clock, Wrench, Brain, ArrowRight, ChevronDown, ChevronRight as ChevronR } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { supabase } from '@/lib/supabase-browser';
import type { AgentNodeData, AgentStatus, ExecutionStep, ContractResultRecord, LlmCallPayload, ToolCallPayload, ContractCheckPayload } from '@/lib/types';
import { cn } from '@/lib/cn';

function StepItem({ step }: { step: ExecutionStep }) {
  const [open, setOpen] = useState(false);
  const p = step.payload;

  if (p.kind === 'llm_call') {
    const lp = p as LlmCallPayload;
    if (!lp.delta) return null;
    return (
      <div className="flex gap-2 py-0.5 group">
        <Brain className="w-3 h-3 text-gray-300 mt-1 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
        <span className="text-xs text-gray-500 leading-relaxed font-mono">{lp.delta}</span>
      </div>
    );
  }

  if (p.kind === 'tool_call') {
    const tp = p as ToolCallPayload;
    const isCall = tp.input !== undefined && tp.output === undefined;
    return (
      <div className="my-1">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors text-left shadow-sm"
        >
          <Wrench className={cn('w-3 h-3 flex-shrink-0', isCall ? 'text-amber-400' : 'text-emerald-400')} />
          <span className="text-xs font-mono text-gray-500 flex-1 truncate">
            {isCall ? `${tp.tool_name}(...)` : `${tp.tool_name} → result`}
          </span>
          {tp.error && <XCircle className="w-3 h-3 text-red-400" />}
          {open ? <ChevronDown className="w-3 h-3 text-gray-300" /> : <ChevronR className="w-3 h-3 text-gray-300" />}
        </button>
        {open && (
          <div className="mt-1 mx-1 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
            <pre className={cn('text-[11px] whitespace-pre-wrap break-words font-mono', tp.error ? 'text-red-400' : 'text-gray-500')}>
              {isCall ? JSON.stringify(tp.input, null, 2) : tp.output}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (p.kind === 'contract_check') {
    const cp = p as ContractCheckPayload;
    return (
      <div className={cn(
        'flex gap-2 px-2.5 py-2 rounded-lg my-1 text-xs border',
        cp.result === 'pass' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100',
      )}>
        {cp.result === 'pass'
          ? <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
          : <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="font-medium text-gray-800">{cp.description}</p>
          <p className="text-gray-500 mt-0.5">{cp.reasoning}</p>
        </div>
      </div>
    );
  }

  if (p.kind === 'routing') {
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs text-gray-400">
        <ArrowRight className="w-3 h-3" />
        <span className="font-mono">{(p as { message?: string }).message}</span>
      </div>
    );
  }

  return null;
}

function ContractResults({ agentExecId }: { agentExecId: string }) {
  const [results, setResults] = useState<ContractResultRecord[]>([]);

  useEffect(() => {
    if (!agentExecId) return;
    supabase.from('contract_results').select('*').eq('agent_execution_id', agentExecId)
      .then(({ data }) => setResults(data ?? []));

    const ch = supabase.channel(`cr:${agentExecId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contract_results', filter: `agent_execution_id=eq.${agentExecId}` },
        (p) => setResults((prev) => [...prev, p.new as ContractResultRecord]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agentExecId]);

  if (!results.length) return null;

  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-2">Contract results</p>
      {results.map((r) => (
        <div key={r.id} className={cn(
          'flex gap-2 px-2.5 py-2 rounded-lg mb-1.5 text-xs border',
          r.result === 'pass' ? 'bg-emerald-50 border-emerald-100' :
          r.result === 'fail' ? 'bg-red-50 border-red-100' :
          'bg-gray-50 border-gray-100',
        )}>
          {r.result === 'pass' ? <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
          : r.result === 'fail' ? <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
          : <Clock className="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />}
          <div>
            <span className={cn('font-semibold text-[10px] uppercase tracking-wide',
              r.result === 'pass' ? 'text-emerald-600' :
              r.result === 'fail' ? 'text-red-500' : 'text-gray-400',
            )}>{r.result}</span>
            <p className="text-gray-500 mt-0.5">{r.judge_reasoning}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExecutionPanel() {
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const getSelectedAgent = useWorkflowStore((s) => s.getSelectedAgent);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);
  const executionId = useExecutionStore((s) => s.executionId);
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecIds = useExecutionStore((s) => s.agentExecutionIds);

  const agent = getSelectedAgent() as AgentNodeData | null;
  const status: AgentStatus = (selectedAgentId ? agentStatuses[selectedAgentId] : undefined) ?? 'idle';
  const agentExecId = selectedAgentId ? agentExecIds[selectedAgentId] : undefined;

  useEffect(() => {
    if (!agentExecId || !executionId) { setSteps([]); return; }
    setSteps([]);
    fetch(`/api/executions/${executionId}/steps?agent_execution_id=${agentExecId}`)
      .then(r => r.json()).then(data => setSteps(Array.isArray(data) ? data : []));

    const ch = supabase.channel(`steps:${agentExecId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execution_steps', filter: `agent_execution_id=eq.${agentExecId}` },
        (p) => setSteps((prev) => [...prev, p.new as ExecutionStep]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agentExecId, executionId]);

  if (!selectedAgentId || !agent) {
    return (
      <div className="w-80 h-full bg-gray-50/40 border-l border-gray-100 flex items-center justify-center text-xs text-gray-400 px-6 text-center">
        Click an agent node to see its live execution steps
      </div>
    );
  }

  const statusRingBg = {
    running:   'bg-blue-50',
    completed: 'bg-emerald-50',
    failed:    'bg-red-50',
    idle:      'bg-violet-50',
    skipped:   'bg-gray-50',
  }[status];

  const statusIconColor = {
    running:   'text-blue-400',
    completed: 'text-emerald-500',
    failed:    'text-red-400',
    idle:      'text-violet-400',
    skipped:   'text-gray-300',
  }[status];

  const displaySteps = steps.filter(s => !(s.payload.kind === 'llm_call' && !(s.payload as LlmCallPayload).delta));

  return (
    <div className="w-80 h-full bg-gray-50/40 border-l border-gray-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', statusRingBg)}>
          <Bot className={cn('w-3.5 h-3.5', statusIconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{agent.name}</p>
          <p className="text-xs text-gray-400 truncate">{agent.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
          {status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
          {status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          <button
            onClick={() => selectAgent(null)}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* System prompt */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1.5">System prompt</p>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{agent.system_prompt}</p>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!executionId && (
          <p className="text-xs text-gray-400 text-center mt-8">Run to see execution steps</p>
        )}
        {executionId && displaySteps.length === 0 && status === 'idle' && (
          <p className="text-xs text-gray-400 text-center mt-8">Waiting to start…</p>
        )}
        {displaySteps.map((s) => <StepItem key={s.id} step={s} />)}
        {status === 'running' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /><span>Processing…</span>
          </div>
        )}
        {agentExecId && <ContractResults agentExecId={agentExecId} />}
      </div>
    </div>
  );
}
