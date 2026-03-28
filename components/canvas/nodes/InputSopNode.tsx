'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputSopNodeData {
  label: string;
  nlPrompt: string;
  sopTitle?: string;
  sopSnippet?: string;
  [key: string]: unknown;
}

export const InputSopNode = memo(function InputSopNode({ data: raw, selected }: NodeProps) {
  const data = raw as unknown as InputSopNodeData;
  const hasDoc = !!data.sopSnippet;

  return (
    <div
      className={cn(
        'relative bg-white border-2 rounded-xl min-w-[220px] max-w-[260px] shadow-sm transition-all duration-150 select-none',
        selected ? 'ring-2 ring-violet-500/25 border-violet-300' : 'border-emerald-300',
      )}
    >
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-violet-500 !border-white !border-2" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {data.sopTitle || 'Input'}
          </p>
          <p className="text-[10px] text-gray-400">SOP / Prompt</p>
        </div>
      </div>

      {/* Body — prompt or SOP snippet */}
      <div className="px-3.5 py-2.5">
        {hasDoc ? (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-4">
            {data.sopSnippet}
          </p>
        ) : (
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
            {data.nlPrompt || data.label}
          </p>
        )}
      </div>
    </div>
  );
});

export default InputSopNode;
