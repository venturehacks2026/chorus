'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentNodeData, AgentStatus } from '@/lib/types';
import { useExecutionStore } from '@/stores/executionStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { cn } from '@/lib/cn';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AgentNode = memo(function AgentNode({ data: raw, selected }: NodeProps<any>) {
  const data = raw as AgentNodeData;
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecIds = useExecutionStore((s) => s.agentExecutionIds);
  const selectedAgentExecId = useExecutionStore((s) => s.selectedAgentExecutionId);
  const selectAgentExecution = useExecutionStore((s) => s.selectAgentExecution);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);

  const status: AgentStatus = agentStatuses[data.id] ?? 'idle';
  const agentExecId = agentExecIds[data.id];
  const isActiveExec = agentExecId === selectedAgentExecId;

  function handleClick() {
    selectAgent(data.id);
    if (agentExecId) selectAgentExecution(agentExecId);
  }

  const borderClass = {
    running: 'border-blue-400',
    completed: 'border-emerald-500',
    failed: 'border-red-400',
    idle: 'border-border',
    skipped: 'border-border',
  }[status];

  const statusLabel = {
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    idle: null,
    skipped: null,
  }[status];

  const statusColor = {
    running: 'text-blue-500',
    completed: 'text-emerald-600',
    failed: 'text-red-500',
    idle: '',
    skipped: '',
  }[status];

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative bg-bg border rounded-lg px-4 py-3 min-w-[200px] cursor-pointer select-none shadow-sm',
        'transition-all duration-150',
        borderClass,
        status === 'running' && 'shadow-blue-100 shadow-md',
        (selected || isActiveExec) && 'ring-1 ring-text/20',
      )}
    >
      {status === 'running' && (
        <span className="absolute inset-0 rounded-lg border border-blue-300 animate-pulse pointer-events-none" />
      )}

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-border !border-bg" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-border !border-bg" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{data.name}</p>
          <p className="text-xs text-text-subtle mt-0.5 truncate">{data.role}</p>
        </div>
        {statusLabel && (
          <span className={cn('text-xs font-medium shrink-0', statusColor)}>
            {statusLabel}
          </span>
        )}
      </div>

      {data.tools.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {data.tools.map((t) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-muted border border-border text-text-subtle font-mono">
              {t.connector_id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
