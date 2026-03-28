'use client';

import { CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import type { ASDListItem, SOPListItem } from '@/lib/knowledge-types';
import SOPDocumentCard from './SOPDocumentCard';

interface Props {
  sops: SOPListItem[];
  asds: ASDListItem[];
  compilingSopIds: Set<string>;
  onCompile: (sopId: string) => void;
  onViewSOP: (sopId: string) => void;
  onDelete: (sopId: string) => void;
}

export default function SOPTable({ sops, asds, compilingSopIds, onCompile, onViewSOP, onDelete }: Props) {
  const compiledSopIds = new Set(asds.map(a => a.sop_id));

  if (sops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="text-sm text-gray-500">No documents uploaded yet</p>
        <p className="text-xs text-gray-400 mt-1">Upload an SOP to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {sops.map(sop => {
        const isCompiling = compilingSopIds.has(sop.id);
        const isCompiled = compiledSopIds.has(sop.id);
        return (
          <div key={sop.id} className="group flex flex-col gap-2">
            <SOPDocumentCard
              title={sop.title}
              dateLabel={new Date(sop.created_at).toLocaleDateString()}
              sourceType={sop.source_type}
              onClick={() => onViewSOP(sop.id)}
            />
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              <button
                type="button"
                onClick={() => onDelete(sop.id)}
                title="Delete"
                className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {isCompiling ? (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Compiling…
                </span>
              ) : isCompiled ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Compiled
                  </span>
                  <button
                    type="button"
                    onClick={() => onCompile(sop.id)}
                    title="Recompile"
                    className="p-0.5 rounded text-gray-300 hover:text-violet-600 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onCompile(sop.id)}
                  className="text-[10px] font-medium px-2 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  Compile
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
