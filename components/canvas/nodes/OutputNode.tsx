'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileOutput, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface OutputNodeData {
  label: string;
  status: 'pending' | 'running' | 'completed';
  outputPreview?: string;
  [key: string]: unknown;
}

export const OutputNode = memo(function OutputNode({ data: raw, selected }: NodeProps) {
  const data = raw as unknown as OutputNodeData;
  const status = data.status ?? 'pending';

  const borderClass = {
    pending:   'border-gray-200 border-dashed',
    running:   'border-blue-300',
    completed: 'border-emerald-400',
  }[status];

  const headerBg = {
    pending:   'bg-gray-50',
    running:   'bg-blue-50',
    completed: 'bg-emerald-50',
  }[status];

  const iconColor = {
    pending:   'text-gray-400',
    running:   'text-blue-500',
    completed: 'text-emerald-600',
  }[status];

  return (
    <div
      className={cn(
        'relative bg-white border-2 rounded-xl min-w-[220px] max-w-[280px] shadow-sm transition-all duration-150 select-none',
        borderClass,
        selected && 'ring-2 ring-violet-500/25 border-violet-300',
        status === 'running' && 'shadow-blue-100 shadow-md',
      )}
    >
      {status === 'running' && (
        <span className="absolute inset-0 rounded-xl border-2 border-blue-300/50 animate-pulse pointer-events-none" />
      )}

      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-violet-500 !border-white !border-2" />

      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-100 rounded-t-xl', headerBg)}>
        <div className="w-6 h-6 rounded-md bg-white/80 flex items-center justify-center shrink-0">
          {status === 'running' ? (
            <Loader2 className={cn('w-3.5 h-3.5 animate-spin', iconColor)} />
          ) : status === 'completed' ? (
            <CheckCircle2 className={cn('w-3.5 h-3.5', iconColor)} />
          ) : (
            <FileOutput className={cn('w-3.5 h-3.5', iconColor)} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {data.label || 'Output'}
          </p>
          <p className="text-[10px] text-gray-400">
            {status === 'pending' ? 'Awaiting results' : status === 'running' ? 'Generating...' : 'Complete'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5">
        {status === 'completed' && data.outputPreview ? (
          <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-5 whitespace-pre-wrap">
            {data.outputPreview}
          </p>
        ) : status === 'pending' ? (
          <p className="text-[11px] text-gray-400 italic">
            Results will appear here when the workflow completes.
          </p>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <p className="text-[11px] text-gray-400">Processing...</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default OutputNode;
