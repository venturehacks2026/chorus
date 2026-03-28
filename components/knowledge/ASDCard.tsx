'use client';

import { GitBranch, CircleDot } from 'lucide-react';
import type { ASDListItem, ASDStatus } from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

const STATUS_STYLE: Record<ASDStatus, string> = {
  compiling:           'bg-blue-50 text-blue-600',
  active:              'bg-emerald-50 text-emerald-700',
  needs_clarification: 'bg-amber-50 text-amber-600',
  needs_recompile:     'bg-red-50 text-red-600',
  archived:            'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<ASDStatus, string> = {
  compiling:           'Compiling',
  active:              'Active',
  needs_clarification: 'Needs Clarification',
  needs_recompile:     'Needs Recompile',
  archived:            'Archived',
};

interface Props {
  asd: ASDListItem;
  onClick: () => void;
}

export default function ASDCard({ asd, onClick }: Props) {
  const coverage = asd.automation_coverage_score ?? 0;
  const pct = Math.round(coverage * 100);

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-600/40 hover:shadow-sm transition-all duration-150 flex flex-col gap-3"
    >
      {/* top row: title + status */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-gray-900 leading-tight">{asd.skill_id}</p>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_STYLE[asd.status])}>
          {STATUS_LABEL[asd.status]}
        </span>
      </div>

      {/* description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
        {asd.description || 'Agent skill document compiled from SOP'}
      </p>

      {/* stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <CircleDot className="w-3 h-3" />
          v{asd.current_version}
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {asd.status === 'compiling' ? '…' : 'View graph'}
        </span>
      </div>

      {/* coverage bar */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gray-400">Automation coverage</span>
          <span className="text-[11px] font-semibold text-gray-900 tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}
