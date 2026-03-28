'use client';

import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, AgentStatus } from '@/lib/types';
import { useExecutionStore } from '@/stores/executionStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { supabase } from '@/lib/supabase-browser';
import { cn } from '@/lib/cn';

function ShieldBadge({ agentId, workflowId }: { agentId: string; workflowId: string | null }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!workflowId) return;
    supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('agent_id', agentId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [agentId, workflowId]);

  if (count === 0) return null;

  return (
    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-violet-200 rounded-full px-1.5 py-0.5 shadow-sm z-10">
      <svg className="w-3 h-3 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span className="text-[9px] font-bold text-violet-600">{count}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AgentNode = memo(function AgentNode({ data: raw, selected }: NodeProps<any>) {
  const data = raw as AgentNodeData;
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecIds = useExecutionStore((s) => s.agentExecutionIds);
  const selectedAgentExecId = useExecutionStore((s) => s.selectedAgentExecutionId);
  const selectAgentExecution = useExecutionStore((s) => s.selectAgentExecution);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);
  const workflowId = useWorkflowStore((s) => s.workflowId);

  const status: AgentStatus = agentStatuses[data.id] ?? 'idle';
  const agentExecId = agentExecIds[data.id];
  const isActiveExec = agentExecId === selectedAgentExecId;

  function handleClick() {
    selectAgent(data.id);
    if (agentExecId) selectAgentExecution(agentExecId);
  }

  const borderClass = {
    running:   'border-blue-300',
    completed: 'border-emerald-400',
    failed:    'border-red-300',
    idle:      'border-gray-200',
    skipped:   'border-gray-100',
  }[status];

  const statusLabel = {
    running:   'Running',
    completed: 'Done',
    failed:    'Failed',
    idle:      null,
    skipped:   null,
  }[status];

  const statusColor = {
    running:   'text-blue-500',
    completed: 'text-emerald-600',
    failed:    'text-red-500',
    idle:      '',
    skipped:   '',
  }[status];

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative bg-white border-2 rounded-xl min-w-[200px] max-w-[260px] w-[240px] cursor-pointer select-none',
        'shadow-sm transition-all duration-150',
        borderClass,
        status === 'running' && 'shadow-blue-100 shadow-md',
        (selected || isActiveExec) && 'ring-2 ring-violet-500/25 border-violet-300',
      )}
    >
      {status === 'running' && (
        <span className="absolute inset-0 rounded-xl border-2 border-blue-300/50 animate-pulse pointer-events-none" />
      )}

      <ShieldBadge agentId={data.id} workflowId={workflowId} />

      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-violet-500 !border-white !border-2" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-violet-500 !border-white !border-2" />

      <div className="px-3.5 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{data.name}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{data.role}</p>
          </div>
          {statusLabel && (
            <span className={cn('text-[11px] font-semibold shrink-0 mt-0.5', statusColor)}>
              {statusLabel}
            </span>
          )}
        </div>

        {data.tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.tools.map((t) => (
              <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 border border-violet-100 text-violet-600 font-mono truncate max-w-[100px]">
                {t.connector_id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
