import { X, Bot, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { useRealtimeSteps } from '@/hooks/useRealtimeSteps';
import StepItem from './StepItem';
import ContractBadge from './ContractBadge';
import { cn } from '@/lib/cn';

export default function ExecutionPanel() {
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const getSelectedAgent = useWorkflowStore((s) => s.getSelectedAgent);
  const selectAgent = useWorkflowStore((s) => s.selectAgent);
  const executionId = useExecutionStore((s) => s.executionId);
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const agentExecutionIds = useExecutionStore((s) => s.agentExecutionIds);
  const selectedAgentExecutionId = useExecutionStore((s) => s.selectedAgentExecutionId);

  const agent = getSelectedAgent();
  const agentExecutionId = selectedAgentId ? agentExecutionIds[selectedAgentId] : null;
  const status = selectedAgentId ? agentStatuses[selectedAgentId] : undefined;

  const steps = useRealtimeSteps(agentExecutionId ?? null, executionId);

  if (!selectedAgentId || !agent) return null;

  const StatusIcon = {
    running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    failed: <XCircle className="w-4 h-4 text-red-400" />,
    idle: <Clock className="w-4 h-4 text-gray-400" />,
    skipped: <Clock className="w-4 h-4 text-gray-600" />,
  }[status ?? 'idle'];

  // Group consecutive llm_call deltas for display
  const displaySteps = steps.filter((s) => {
    if (s.payload.kind === 'llm_call') {
      const p = s.payload as { kind: string; delta?: string };
      return !!p.delta;
    }
    return true;
  });

  return (
    <div className="w-96 h-full bg-node-bg border-l border-node-border flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-node-border">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
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
          <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
          <p className="text-xs text-gray-500">{agent.role}</p>
        </div>

        <div className="flex items-center gap-2">
          {StatusIcon}
          <button
            onClick={() => selectAgent(null)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-node-border text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* System prompt */}
      <div className="px-4 py-3 border-b border-node-border">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">System Prompt</p>
        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{agent.system_prompt}</p>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {executionId && displaySteps.length === 0 && status === 'idle' && (
          <p className="text-xs text-gray-600 text-center mt-8">
            Agent hasn't started yet
          </p>
        )}

        {!executionId && (
          <p className="text-xs text-gray-600 text-center mt-8">
            Run the workflow to see execution steps
          </p>
        )}

        {displaySteps.map((step) => (
          <StepItem key={step.id} step={step} />
        ))}

        {status === 'running' && (
          <div className="flex items-center gap-2 py-2 text-xs text-gray-500 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}

        <ContractBadge agentExecutionId={agentExecutionId ?? null} />
      </div>
    </div>
  );
}
