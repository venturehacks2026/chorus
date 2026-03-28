'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  X, Loader2, CheckCircle, XCircle, Clock, Wrench, Brain,
  ArrowRight, ChevronDown, ChevronRight as ChevronR, Shield, Minus, Database,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { supabase } from '@/lib/supabase-browser';
import type {
  AgentNodeData, AgentStatus, ExecutionStep, ContractResultRecord,
  LlmCallPayload, ToolCallPayload, ContractCheckPayload,
} from '@/lib/types';
import { cn } from '@/lib/cn';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect and render inline code or full code blocks in a text string.
 * Splits on ```lang\n…\n``` fences and `inline` ticks.
 */
function RichText({ text }: { text: string }) {
  // First split on fenced code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <span className="leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          // Strip the fence markers and optional language tag
          const inner = part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
          return (
            <pre
              key={i}
              className="block mt-1.5 mb-1.5 p-2.5 rounded-lg bg-gray-950 text-emerald-300 text-[11px] font-mono whitespace-pre overflow-x-auto border border-gray-800"
            >
              {inner}
            </pre>
          );
        }
        // Handle inline `code` within this segment
        const inline = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {inline.map((seg, j) => {
              if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
                return (
                  <code key={j} className="px-1 py-0.5 rounded bg-gray-100 text-violet-700 text-[11px] font-mono">
                    {seg.slice(1, -1)}
                  </code>
                );
              }
              return <span key={j}>{seg}</span>;
            })}
          </span>
        );
      })}
    </span>
  );
}

// ─── LLM text accumulator ─────────────────────────────────────────────────────

/**
 * Takes the list of llm_call steps for one agent and returns the full
 * accumulated text. Deltas with no text (just metadata events) are skipped.
 */
function accumulateText(steps: ExecutionStep[]): string {
  return steps
    .filter(s => s.payload.kind === 'llm_call')
    .map(s => (s.payload as LlmCallPayload).delta ?? '')
    .join('');
}

// ─── Step sub-components ──────────────────────────────────────────────────────

function LlmBlock({ steps, isStreaming }: { steps: ExecutionStep[]; isStreaming: boolean }) {
  const text = useMemo(() => accumulateText(steps), [steps]);
  if (!text && !isStreaming) return null;

  return (
    <div className="flex gap-2 py-1 group">
      <Brain className="w-3 h-3 text-gray-300 mt-1 flex-shrink-0 group-hover:text-violet-300 transition-colors" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 leading-relaxed">
          {text ? <RichText text={text} /> : null}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </p>
      </div>
    </div>
  );
}

function ToolCallItem({ step }: { step: ExecutionStep }) {
  const [open, setOpen] = useState(false);
  const tp = step.payload as ToolCallPayload;
  const isCall = tp.input !== undefined && tp.output === undefined;
  const isDataStore = tp.tool_name === 'data-store';

  return (
    <div className="my-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors text-left shadow-sm"
      >
        {isDataStore
          ? <Database className={cn('w-3 h-3 flex-shrink-0', isCall ? 'text-indigo-400' : 'text-indigo-500')} />
          : <Wrench className={cn('w-3 h-3 flex-shrink-0', isCall ? 'text-amber-400' : 'text-emerald-400')} />
        }
        <span className="text-xs font-mono text-gray-500 flex-1 truncate">
          {isCall ? `${tp.tool_name}(…)` : `${tp.tool_name} → result`}
        </span>
        {tp.error && <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
        {!isCall && !tp.error && <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
        {open ? <ChevronDown className="w-3 h-3 text-gray-300" /> : <ChevronR className="w-3 h-3 text-gray-300" />}
      </button>
      {open && (
        <div className="mt-1 mx-1 rounded-lg overflow-hidden border border-gray-100">
          <pre className={cn(
            'text-[11px] p-2.5 whitespace-pre-wrap break-words font-mono overflow-x-auto',
            tp.error ? 'bg-red-50 text-red-500' : 'bg-gray-950 text-emerald-300',
          )}>
            {isCall
              ? JSON.stringify(tp.input, null, 2)
              : (tp.output ?? '')
            }
          </pre>
        </div>
      )}
    </div>
  );
}

function ContractItem({ step }: { step: ExecutionStep }) {
  const cp = step.payload as ContractCheckPayload;
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
        <p className="text-gray-500 mt-0.5 leading-relaxed">{cp.reasoning}</p>
      </div>
    </div>
  );
}

// ─── Per-agent contract results ───────────────────────────────────────────────

function AgentContractResults({ agentExecId }: { agentExecId: string }) {
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
    <div className="mt-2 space-y-1">
      {results.map((r) => (
        <div key={r.id} className={cn(
          'flex gap-2 px-2.5 py-1.5 rounded-lg text-xs border',
          r.result === 'pass' ? 'bg-emerald-50 border-emerald-100' :
          r.result === 'fail' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100',
        )}>
          {r.result === 'pass' ? <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
          : r.result === 'fail' ? <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
          : <Clock className="w-3 h-3 text-gray-300 mt-0.5 flex-shrink-0" />}
          <div className="min-w-0">
            <span className={cn('font-semibold text-[10px] uppercase tracking-wide',
              r.result === 'pass' ? 'text-emerald-600' :
              r.result === 'fail' ? 'text-red-500' : 'text-gray-400',
            )}>{r.result}</span>
            <p className="text-gray-500 mt-0.5 leading-relaxed line-clamp-3">{r.judge_reasoning}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Collapsible agent row ────────────────────────────────────────────────────

function AgentRow({
  agent,
  status,
  agentExecId,
  steps,
  isActive,
  onClick,
}: {
  agent: AgentNodeData;
  status: AgentStatus;
  agentExecId?: string;
  steps: ExecutionStep[];
  isActive: boolean;
  onClick: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'running') setOpen(true);
  }, [status]);

  // Separate step types
  const llmSteps = steps.filter(s => s.payload.kind === 'llm_call');
  const toolSteps = steps.filter(s => s.payload.kind === 'tool_call');
  const contractSteps = steps.filter(s => s.payload.kind === 'contract_check');
  const routingSteps = steps.filter(s => s.payload.kind === 'routing');

  const isStreaming = status === 'running';

  const statusIcon = {
    idle:      <Minus className="w-3.5 h-3.5 text-gray-300" />,
    running:   <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    completed: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
    failed:    <XCircle className="w-3.5 h-3.5 text-red-400" />,
    skipped:   <Minus className="w-3.5 h-3.5 text-gray-300" />,
  }[status];

  const rowBg = {
    idle:      '',
    running:   'bg-blue-50/50',
    completed: 'bg-emerald-50/40',
    failed:    'bg-red-50/40',
    skipped:   '',
  }[status];

  return (
    <div className={cn('border border-gray-100 rounded-xl overflow-hidden transition-all', isActive && 'ring-1 ring-violet-200')}>
      <button
        className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors', rowBg || 'hover:bg-gray-50/60')}
        onClick={() => { setOpen(o => !o); onClick(); }}
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{agent.name}</p>
          <p className="text-xs text-gray-400 truncate">{agent.role}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {status === 'running' && (
            <span className="text-[10px] font-medium text-blue-500 animate-pulse">Running</span>
          )}
          {status === 'completed' && (
            <span className="text-[10px] font-medium text-emerald-600">Done</span>
          )}
          {status === 'failed' && (
            <span className="text-[10px] font-medium text-red-500">Failed</span>
          )}
          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-300 ml-1" /> : <ChevronR className="w-3.5 h-3.5 text-gray-300 ml-1" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-50 space-y-1">
          {steps.length === 0 && status === 'idle' && (
            <p className="text-xs text-gray-400 py-2 text-center">Waiting…</p>
          )}

          {/* Routing messages */}
          {routingSteps.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-400">
              <ArrowRight className="w-3 h-3 flex-shrink-0" />
              <span className="font-mono">{(s.payload as { message?: string }).message}</span>
            </div>
          ))}

          {/* Tool calls (shown in order) */}
          {toolSteps.map(s => <ToolCallItem key={s.id} step={s} />)}

          {/* Contract checks */}
          {contractSteps.map(s => <ContractItem key={s.id} step={s} />)}

          {/* LLM output — accumulated as one readable block, not delta-by-delta */}
          <LlmBlock steps={llmSteps} isStreaming={isStreaming} />

          {status === 'running' && steps.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /><span>Processing…</span>
            </div>
          )}

          {agentExecId && <AgentContractResults agentExecId={agentExecId} />}
        </div>
      )}
    </div>
  );
}

// ─── Overall verification banner ─────────────────────────────────────────────

function VerificationBanner({
  executionStatus,
  agents,
  agentStatuses,
}: {
  executionStatus: string | null;
  agents: AgentNodeData[];
  agentStatuses: Record<string, AgentStatus>;
}) {
  if (!executionStatus || executionStatus === 'running') return null;

  const allCompleted = agents.every(a => agentStatuses[a.id] === 'completed');
  const anyFailed = agents.some(a => agentStatuses[a.id] === 'failed');
  const overallPassed = executionStatus === 'completed' && allCompleted && !anyFailed;

  return (
    <div className={cn(
      'mx-3 mb-3 rounded-xl border px-4 py-3.5',
      overallPassed
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-red-50 border-red-200',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          overallPassed ? 'bg-emerald-100' : 'bg-red-100',
        )}>
          <Shield className={cn('w-4 h-4', overallPassed ? 'text-emerald-600' : 'text-red-500')} />
        </div>
        <div>
          <p className={cn('text-sm font-semibold', overallPassed ? 'text-emerald-800' : 'text-red-700')}>
            {overallPassed ? 'Task completed successfully' : 'Task did not complete cleanly'}
          </p>
          <p className={cn('text-xs mt-0.5 leading-relaxed', overallPassed ? 'text-emerald-600' : 'text-red-500')}>
            {overallPassed
              ? `All ${agents.length} sub-agent${agents.length !== 1 ? 's' : ''} completed and contracts verified.`
              : `${agents.filter(a => agentStatuses[a.id] === 'failed').length} agent(s) failed or a blocking contract was violated.`
            }
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {agents.map(a => {
              const s = agentStatuses[a.id] ?? 'idle';
              return (
                <span key={a.id} className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                  s === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  s === 'failed'    ? 'bg-red-100 text-red-600 border-red-200' :
                  'bg-gray-100 text-gray-500 border-gray-200',
                )}>
                  {a.name}
                  {s === 'completed' && ' ✓'}
                  {s === 'failed' && ' ✗'}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function ExecutionPanel({ workflowAgents }: { workflowAgents: AgentNodeData[] }) {
  const [stepsByAgent, setStepsByAgent] = useState<Record<string, ExecutionStep[]>>({});
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);
  const executionId = useExecutionStore((s) => s.executionId);
  const executionStatus = useExecutionStore((s) => s.executionStatus);
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecIds = useExecutionStore((s) => s.agentExecutionIds);

  // Stable dep key for agentExecIds
  const agentExecIdsKey = JSON.stringify(agentExecIds);

  // Subscribe to steps for all agents when execution starts
  useEffect(() => {
    if (!executionId) { setStepsByAgent({}); return; }
    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const agent of workflowAgents) {
      const agentExecId = agentExecIds[agent.id];
      if (!agentExecId) continue;

      // Load existing steps
      fetch(`/api/executions/${executionId}/steps?agent_execution_id=${agentExecId}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStepsByAgent(prev => ({ ...prev, [agent.id]: data }));
          }
        });

      // Subscribe to new steps in realtime
      const ch = supabase.channel(`steps:${agentExecId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'execution_steps',
          filter: `agent_execution_id=eq.${agentExecId}`,
        }, (p) => {
          setStepsByAgent(prev => ({
            ...prev,
            [agent.id]: [...(prev[agent.id] ?? []), p.new as ExecutionStep],
          }));
        })
        .subscribe();
      channels.push(ch);
    }

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, agentExecIdsKey]);

  if (!executionId) {
    return (
      <div className="w-96 h-full bg-gray-50/40 border-l border-gray-100 flex items-center justify-center text-xs text-gray-400 px-6 text-center">
        Hit <strong className="text-gray-700 mx-1">Run</strong> to start execution
      </div>
    );
  }

  return (
    <div className="w-96 h-full bg-gray-50/40 border-l border-gray-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">Execution</span>
          {executionStatus === 'running' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-blue-500">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running
            </span>
          )}
        </div>
        <button
          onClick={() => selectAgent(null)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Verification banner (shows after completion) */}
      {(executionStatus === 'completed' || executionStatus === 'failed') && (
        <div className="pt-3">
          <VerificationBanner
            executionStatus={executionStatus}
            agents={workflowAgents}
            agentStatuses={agentStatuses}
          />
        </div>
      )}

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {workflowAgents.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">No agents in this workflow</p>
        )}
        {workflowAgents.map((agent, i) => (
          <div key={agent.id} className="flex flex-col gap-0">
            <AgentRow
              agent={agent}
              status={agentStatuses[agent.id] ?? 'idle'}
              agentExecId={agentExecIds[agent.id]}
              steps={stepsByAgent[agent.id] ?? []}
              isActive={selectedAgentId === agent.id}
              onClick={() => selectAgent(agent.id)}
            />
            {i < workflowAgents.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowRight className="w-3 h-3 text-gray-200 rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
