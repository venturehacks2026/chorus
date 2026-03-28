'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Bot, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
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

  const ringClass = {
    running: 'border-sand-500 shadow-sand-400/20',
    completed: 'border-emerald-600/50',
    failed: 'border-red-400/60',
    idle: 'border-border',
    skipped: 'border-border/50',
  }[status];

  const StatusIcon = {
    running: <Loader2 className="w-3 h-3 text-sand-600 animate-spin" />,
    completed: <CheckCircle className="w-3 h-3 text-emerald-600" />,
    failed: <XCircle className="w-3 h-3 text-red-500" />,
    idle: null,
    skipped: null,
  }[status];

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative bg-bg-muted border rounded-xl px-4 py-3 min-w-[200px] cursor-pointer select-none',
        'transition-all duration-150',
        ringClass,
        status === 'running' && 'shadow-lg',
        (selected || isActiveExec) && 'ring-1 ring-accent/50',
      )}
    >
      {status === 'running' && (
        <span className="absolute inset-0 rounded-xl border border-sand-400/50 animate-pulse-soft pointer-events-none" />
      )}

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-sand-400 !border-sand-300" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-sand-400 !border-sand-300" />

      <div className="flex items-start gap-2.5">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
          status === 'running' ? 'bg-sand-400/20' :
          status === 'completed' ? 'bg-emerald-500/10' :
          status === 'failed' ? 'bg-red-500/10' : 'bg-accent-muted',
        )}>
          <Bot className={cn(
            'w-3.5 h-3.5',
            status === 'running' ? 'text-sand-600' :
            status === 'completed' ? 'text-emerald-600' :
            status === 'failed' ? 'text-red-500' : 'text-sand-700',
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <p className="text-sm font-medium text-text truncate">{data.name}</p>
            {StatusIcon}
          </div>
          <p className="text-xs text-text-subtle mt-0.5 truncate">{data.role}</p>
        </div>
      </div>

      {data.tools.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {data.tools.map((t) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-md bg-border/60 text-text-subtle font-mono">
              {t.connector_id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
