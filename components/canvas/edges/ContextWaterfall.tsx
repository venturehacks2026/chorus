'use client';

import { useState } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import type { ASDEdgeData } from '@/lib/types';

interface Props {
  labelX: number;
  labelY: number;
  data?: ASDEdgeData;
  edgeId: string;
  isSelected: boolean;
}

export default function ContextWaterfall({ labelX, labelY, data, edgeId, isSelected }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!isSelected || !data?.contextData) return null;

  const { inputPreview, outputPreview, fullInput, fullOutput } = data.contextData;
  if (!inputPreview && !outputPreview) return null;

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 12}px)`,
          pointerEvents: 'all',
          zIndex: 50,
        }}
        className="nodrag nopan"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all text-xs"
        >
          <ArrowRight className="w-3 h-3 text-violet-500" />
          <span className="text-text-muted font-mono text-[10px] max-w-[120px] truncate">
            {inputPreview ?? 'context'}
          </span>
          {expanded ? <ChevronDown className="w-3 h-3 text-text-subtle" /> : <ChevronRight className="w-3 h-3 text-text-subtle" />}
        </button>

        {expanded && (
          <div className="mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-3">
            {inputPreview && (
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Input</span>
                <pre className="mt-1 text-[10px] text-text-muted font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto leading-relaxed">
                  {typeof fullInput === 'string' ? fullInput : JSON.stringify(fullInput, null, 2)}
                </pre>
              </div>
            )}
            {outputPreview && (
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Output</span>
                <pre className="mt-1 text-[10px] text-text-muted font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto leading-relaxed">
                  {typeof fullOutput === 'string' ? fullOutput : JSON.stringify(fullOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </EdgeLabelRenderer>
  );
}
