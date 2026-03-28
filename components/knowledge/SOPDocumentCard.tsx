'use client';

import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SourceType } from '@/lib/knowledge-types';

const SOURCE_BADGE: Record<SourceType, string> = {
  text: 'bg-gray-100 text-gray-500',
  pdf: 'bg-blue-50 text-blue-600',
  docx: 'bg-amber-50 text-amber-600',
  confluence: 'bg-violet-50 text-violet-600',
  notion: 'bg-emerald-50 text-emerald-700',
};

const LINE_WIDTHS = [0.75, 1, 0.85, 1, 0.9, 0.7, 1, 0.8, 1, 0.65, 1, 0.75];

export interface SOPDocumentCardProps {
  title: string;
  dateLabel: string;
  sourceType?: SourceType;
  selected?: boolean;
  /** Non-interactive sample tiles */
  isPlaceholder?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export default function SOPDocumentCard({
  title,
  dateLabel,
  sourceType,
  selected,
  isPlaceholder,
  onClick,
  footer,
}: SOPDocumentCardProps) {
  const thumb = (
    <div
      className={cn(
        'relative w-full aspect-[3/4] rounded-xl border shadow-sm transition-all duration-150 overflow-hidden',
        isPlaceholder && 'border-dashed border-gray-200 bg-gray-50/80',
        !isPlaceholder && selected && 'border-violet-400 shadow-violet-100 ring-2 ring-violet-300/50',
        !isPlaceholder && !selected && 'border-gray-200 bg-white group-hover:border-violet-200 group-hover:shadow-md',
      )}
    >
      <div className="absolute inset-0 px-3 pt-5 pb-4 flex flex-col gap-1.5">
        {LINE_WIDTHS.map((w, i) => (
          <div
            key={i}
            className={cn('h-1 rounded-full', i === 0 ? 'bg-gray-300' : 'bg-gray-100')}
            style={{ width: `${w * 100}%` }}
          />
        ))}
      </div>

      {sourceType && !isPlaceholder && (
        <div className="absolute top-2 right-2">
          <span className={cn('text-[8px] font-semibold px-1.5 py-0.5 rounded-full uppercase', SOURCE_BADGE[sourceType])}>
            {sourceType}
          </span>
        </div>
      )}

      {selected && !isPlaceholder && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shadow-sm">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {isPlaceholder && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-gray-300">
          <FileText className="w-4 h-4" />
        </div>
      )}

      {!isPlaceholder && !selected && onClick && (
        <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-50/35 transition-colors" />
      )}
    </div>
  );

  const meta = (
    <div className="px-0.5">
      <p
        className={cn(
          'text-xs font-medium leading-snug line-clamp-2 transition-colors',
          isPlaceholder && 'text-gray-400',
          !isPlaceholder && selected && 'text-violet-600',
          !isPlaceholder && !selected && 'text-gray-800 group-hover:text-violet-600',
        )}
      >
        {title}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{dateLabel}</p>
      {footer}
    </div>
  );

  if (onClick && !isPlaceholder) {
    return (
      <button type="button" onClick={onClick} className="group flex flex-col gap-2 cursor-pointer select-none text-left w-full transition-all">
        {thumb}
        {meta}
      </button>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', isPlaceholder && 'pointer-events-none')}>
      {thumb}
      {meta}
    </div>
  );
}
