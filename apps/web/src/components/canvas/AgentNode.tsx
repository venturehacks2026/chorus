import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Bot, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import type { AgentNodeData } from 'chorus-shared';
import { useExecutionStore } from '@/stores/executionStore';
import { useWorkflowStore, type AgentFlowNode } from '@/stores/workflowStore';
import { cn } from '@/lib/cn';

type Props = NodeProps<AgentFlowNode>;

export const AgentNode = memo(function AgentNode({ data: rawData, selected }: Props) {
  const data = rawData as AgentNodeData;
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecutionIds = useExecutionStore((s) => s.agentExecutionIds);
  const selectAgentExecution = useExecutionStore((s) => s.selectAgentExecution);
  const selectedAgentExecutionId = useExecutionStore((s) => s.selectedAgentExecutionId);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);

  const status = agentStatuses[data.id];
  const agentExecutionId = agentExecutionIds[data.id];
  const isSelectedExecution = agentExecutionId === selectedAgentExecutionId;

  function handleClick() {
    selectAgent(data.id);
    if (agentExecutionId) {
      selectAgentExecution(agentExecutionId);
    }
  }

  const borderColor = {
    running: 'border-blue-500',
    completed: 'border-emerald-500',
    failed: 'border-red-500',
    idle: 'border-node-border',
    skipped: 'border-gray-600',
  }[status ?? 'idle'];

  const StatusIcon = {
    running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    completed: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
    idle: <Clock className="w-3.5 h-3.5 text-gray-500" />,
    skipped: <Clock className="w-3.5 h-3.5 text-gray-600" />,
  }[status ?? 'idle'];

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative bg-node-bg border-2 rounded-xl px-4 py-3 min-w-[180px] cursor-pointer',
        'transition-all duration-200',
        borderColor,
        (selected || isSelectedExecution) && 'ring-2 ring-accent ring-offset-1 ring-offset-canvas-bg',
        status === 'running' && 'shadow-lg shadow-blue-500/20',
        status === 'completed' && 'shadow-lg shadow-emerald-500/10',
      )}
    >
      {/* Pulse ring for running state */}
      {status === 'running' && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-500 animate-pulse-ring pointer-events-none" />
      )}

      <Handle type="target" position={Position.Left} className="!bg-node-border !border-node-border !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-node-border !border-node-border !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
          status === 'running' ? 'bg-blue-500/20' :
          status === 'completed' ? 'bg-emerald-500/20' :
          status === 'failed' ? 'bg-red-500/20' : 'bg-accent/20',
        )}>
          <Bot className={cn(
            'w-4 h-4',
            status === 'running' ? 'text-blue-400' :
            status === 'completed' ? 'text-emerald-400' :
            status === 'failed' ? 'text-red-400' : 'text-accent',
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{data.name}</p>
          <p className="text-xs text-gray-500 truncate">{data.role}</p>
        </div>
        <div className="flex-shrink-0">{StatusIcon}</div>
      </div>

      {/* Tools */}
      {data.tools.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.tools.map((tool) => (
            <span
              key={tool.id}
              className="text-[10px] px-1.5 py-0.5 rounded bg-node-border text-gray-400"
            >
              {tool.label || tool.connector_id}
            </span>
          ))}
        </div>
      )}

      {/* Model badge */}
      <div className="mt-2 text-[10px] text-gray-600">{data.model}</div>
    </div>
  );
});
