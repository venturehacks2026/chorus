'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Cpu } from 'lucide-react';
import BaseNode from './BaseNode';
import type { SkillNodeData } from '@/lib/types';

const COLOR = '#7A9E8E'; // sage teal

const CATEGORY_ICON: Record<string, string> = {
  search: '🔍',
  communication: '💬',
  data: '🗄️',
  analysis: '📊',
  integration: '🔗',
  custom: '⚙️',
};

function SkillNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as SkillNodeData;
  const syncBadge = {
    synced: { label: 'Synced', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    drift: { label: 'Drift', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    pending: { label: 'Pending', className: 'bg-sand-200 text-sand-700 border-sand-300' },
  }[d.syncStatus ?? 'synced'];

  return (
    <BaseNode nodeType="skill" color={COLOR} icon={<Cpu className="w-3.5 h-3.5" />} selected={selected} data={d} shape="hexagon">
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{CATEGORY_ICON[d.capability?.category ?? 'custom']}</span>
          <span className="text-[10px] font-mono text-text-subtle">{d.capability?.provider}</span>
        </div>
        {d.inputSchema && (
          <div className="text-[9px] text-text-subtle font-mono">
            IN: {Object.keys(d.inputSchema).slice(0, 2).join(', ')}
            {Object.keys(d.inputSchema).length > 2 && ` +${Object.keys(d.inputSchema).length - 2}`}
          </div>
        )}
        <span className={`inline-block text-[8px] px-1 py-0.5 rounded border font-medium ${syncBadge.className}`}>
          {syncBadge.label}
        </span>
      </div>
    </BaseNode>
  );
}

export default memo(SkillNodeComponent);
