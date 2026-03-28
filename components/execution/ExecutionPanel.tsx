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
        <Brain className="w-3 h-3 text-text-subtle mt-1 flex-shrink-0 opacity-50 group-hover:opacity-100" />
        <span className="text-xs text-text-muted leading-relaxed font-mono">{lp.delta}</span>
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
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg border border-border hover:border-border/80 transition-colors text-left"
        >
          <Wrench className={cn('w-3 h-3 flex-shrink-0', isCall ? 'text-amber-400' : 'text-emerald-400')} />
          <span className="text-xs font-mono text-text-muted flex-1 truncate">
            {isCall ? `${tp.tool_name}(...)` : `${tp.tool_name} → result`}
          </span>
          {tp.error && <XCircle className="w-3 h-3 text-red-400" />}
          {open ? <ChevronDown className="w-3 h-3 text-text-subtle" /> : <ChevronR className="w-3 h-3 text-text-subtle" />}
        </button>
        {open && (
          <div className="mt-1 mx-1 p-2 bg-bg border border-border rounded-lg">
            <pre className={cn('text-[11px] whitespace-pre-wrap break-words font-mono', tp.error ? 'text-red-400' : 'text-text-muted')}>
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
      <div className={cn('flex gap-2 px-2 py-1.5 rounded-lg my-1 text-xs', cp.result === 'pass' ? 'bg-emerald-500/8 border border-emerald-500/20' : 'bg-red-500/8 border border-red-500/20')}>
        {cp.result === 'pass' ? <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="font-medium text-text">{cp.description}</p>
          <p className="text-text-subtle mt-0.5">{cp.reasoning}</p>
        </div>
      </div>
    );
  }

  if (p.kind === 'routing') {
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs text-text-subtle">
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
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle mb-2">Contracts</p>
      {results.map((r) => (
        <div key={r.id} className={cn('flex gap-2 px-2 py-1.5 rounded-lg mb-1 text-xs', r.result === 'pass' ? 'bg-emerald-500/8 border border-emerald-500/20' : r.result === 'fail' ? 'bg-red-500/8 border border-red-500/20' : 'bg-bg border border-border')}>
          {r.result === 'pass' ? <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" /> : r.result === 'fail' ? <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" /> : <Clock className="w-3 h-3 text-text-subtle mt-0.5 flex-shrink-0" />}
          <div>
            <span className={cn('font-medium', r.result === 'pass' ? 'text-emerald-300' : r.result === 'fail' ? 'text-red-300' : 'text-text-subtle')}>{r.result.toUpperCase()}</span>
            <p className="text-text-subtle mt-0.5">{r.judge_reasoning}</p>
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
      <div className="w-80 h-full bg-bg-subtle border-l border-border flex items-center justify-center text-xs text-text-subtle px-6 text-center">
        Click an agent node to see its live execution steps
      </div>
    );
  }

  const statusRingClass = { running: 'bg-blue-500/15', completed: 'bg-emerald-500/15', failed: 'bg-red-500/15', idle: 'bg-accent-muted', skipped: 'bg-bg' }[status];
  const statusIconColor = { running: 'text-blue-400', completed: 'text-emerald-400', failed: 'text-red-400', idle: 'text-accent', skipped: 'text-text-subtle' }[status];

  const displaySteps = steps.filter(s => !(s.payload.kind === 'llm_call' && !(s.payload as LlmCallPayload).delta));

  return (
    <div className="w-80 h-full bg-bg-subtle border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', statusRingClass)}>
          <Bot className={cn('w-3.5 h-3.5', statusIconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{agent.name}</p>
          <p className="text-xs text-text-subtle truncate">{agent.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
          {status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          {status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          <button onClick={() => selectAgent(null)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-border text-text-subtle hover:text-text transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* System prompt */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-text-subtle mb-1.5">System prompt</p>
        <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{agent.system_prompt}</p>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!executionId && (
          <p className="text-xs text-text-subtle text-center mt-8">Run to see execution steps</p>
        )}
        {executionId && displaySteps.length === 0 && status === 'idle' && (
          <p className="text-xs text-text-subtle text-center mt-8">Waiting to start…</p>
        )}
        {displaySteps.map((s) => <StepItem key={s.id} step={s} />)}
        {status === 'running' && (
          <div className="flex items-center gap-1.5 text-xs text-text-subtle mt-1 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /><span>Processing</span>
          </div>
        )}
        {agentExecId && <ContractResults agentExecId={agentExecId} />}
      </div>
    </div>
  );
}
