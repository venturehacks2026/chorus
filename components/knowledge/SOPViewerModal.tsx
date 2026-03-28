'use client';

import { useQuery } from '@tanstack/react-query';
import { X, FileText, Loader2 } from 'lucide-react';
import type { SOPDetail, SourceType } from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

const SOURCE_STYLE: Record<SourceType, string> = {
  text:       'bg-gray-100 text-gray-500',
  pdf:        'bg-blue-50 text-blue-600',
  docx:       'bg-amber-50 text-amber-600',
  confluence: 'bg-violet-50 text-violet-600',
  notion:     'bg-emerald-50 text-emerald-700',
};

interface Props {
  sopId: string | null;
  onClose: () => void;
}

export default function SOPViewerModal({ sopId, onClose }: Props) {
  const { data: sop, isLoading } = useQuery<SOPDetail>({
    queryKey: ['sop-detail', sopId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/sops/${sopId}`);
      return res.json();
    },
    enabled: !!sopId,
  });

  if (!sopId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{sop?.title ?? 'Loading...'}</h2>
              {sop && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', SOURCE_STYLE[sop.source_type])}>
                    {sop.source_type.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-gray-400">{sop.chunk_count} chunks</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            </div>
          ) : sop?.raw_text ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
              {sop.raw_text}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No content available</p>
          )}
        </div>
      </div>
    </div>
  );
}
