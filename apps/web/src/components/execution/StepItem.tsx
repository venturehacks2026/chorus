import { ChevronDown, ChevronRight, Wrench, Brain, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { ExecutionStep, LlmCallPayload, ToolCallPayload, ContractCheckPayload, RoutingPayload } from 'chorus-shared';
import { cn } from '@/lib/cn';

interface Props {
  step: ExecutionStep;
}

export default function StepItem({ step }: Props) {
  const [expanded, setExpanded] = useState(false);
  const payload = step.payload;

  if (payload.kind === 'llm_call') {
    const p = payload as LlmCallPayload;
    if (!p.delta) return null; // skip empty deltas

    return (
      <div className="flex gap-2 py-1">
        <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
        <span className="text-xs text-gray-300 leading-relaxed">{p.delta}</span>
      </div>
    );
  }

  if (payload.kind === 'tool_call') {
    const p = payload as ToolCallPayload;
    const isCall = p.input !== undefined && p.output === undefined;
    const isResult = p.output !== undefined;

    return (
      <div className="my-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg bg-node-border/50 hover:bg-node-border transition-colors text-left"
        >
          <Wrench className={cn('w-3.5 h-3.5 flex-shrink-0', isCall ? 'text-amber-400' : 'text-emerald-400')} />
          <span className="text-xs font-mono text-gray-300 flex-1">
            {isCall ? `→ ${p.tool_name}()` : `← ${p.tool_name} result`}
          </span>
          {p.error && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          {expanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
        </button>

        {expanded && (
          <div className="mt-1 ml-4 p-2 bg-black/30 rounded-lg border border-node-border">
            {isCall && (
              <pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(p.input, null, 2)}
              </pre>
            )}
            {isResult && (
              <pre className={cn('text-[11px] whitespace-pre-wrap break-words font-mono', p.error ? 'text-red-400' : 'text-gray-300')}>
                {p.output}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  if (payload.kind === 'contract_check') {
    const p = payload as ContractCheckPayload;
    return (
      <div className={cn(
        'flex items-start gap-2 py-1.5 px-2 rounded-lg my-1',
        p.result === 'pass' ? 'bg-emerald-500/10' : 'bg-red-500/10',
      )}>
        {p.result === 'pass'
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
          : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className="text-xs font-medium text-gray-200">{p.description}</p>
          <p className="text-xs text-gray-400 mt-0.5">{p.reasoning}</p>
        </div>
      </div>
    );
  }

  if (payload.kind === 'routing') {
    const p = payload as RoutingPayload;
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-gray-500">
        <ArrowRight className="w-3.5 h-3.5" />
        <span>{p.message}</span>
      </div>
    );
  }

  return null;
}
