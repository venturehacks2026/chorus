'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import type { ASDListItem, SOPListItem, SourceType } from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

const SOURCE_STYLE: Record<SourceType, string> = {
  text:       'bg-gray-100 text-gray-500',
  pdf:        'bg-blue-50 text-blue-600',
  docx:       'bg-amber-50 text-amber-600',
  confluence: 'bg-violet-50 text-violet-600',
  notion:     'bg-emerald-50 text-emerald-700',
};

interface Props {
  sops: SOPListItem[];
  asds: ASDListItem[];
  compilingSopIds: Set<string>;
  onCompile: (sopId: string) => void;
}

export default function SOPTable({ sops, asds, compilingSopIds, onCompile }: Props) {
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
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Source</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sops.map((sop) => {
            const isCompiling = compilingSopIds.has(sop.id);
            const isCompiled = compiledSopIds.has(sop.id);
            return (
              <tr key={sop.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5 font-medium text-gray-900">{sop.title}</td>
                <td className="px-4 py-3.5">
                  <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', SOURCE_STYLE[sop.source_type])}>
                    {sop.source_type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">
                  {new Date(sop.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end">
                    {isCompiling ? (
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Compiling…
                      </span>
                    ) : isCompiled ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Compiled
                      </span>
                    ) : (
                      <button
                        onClick={() => onCompile(sop.id)}
                        className="text-xs font-medium px-3 py-1 rounded-md transition-colors text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                      >
                        Compile
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
