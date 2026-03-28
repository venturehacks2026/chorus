'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { UserCheck } from 'lucide-react';
import BaseNode from './BaseNode';
import type { HandoffNodeData } from '@/lib/types';

const COLOR = '#9E8B9E'; // muted mauve

function HandoffNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as HandoffNodeData;
  return (
    <BaseNode nodeType="handoff" color={COLOR} icon={<UserCheck className="w-3.5 h-3.5" />} selected={selected} data={d} shape="dashed">
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sand-200 border border-sand-300 text-text-subtle">
          {d.escalationTarget ?? 'Unassigned'}
        </span>
        {d.slaMinutes > 0 && (
          <span className="text-[10px] text-text-subtle font-mono">{d.slaMinutes}m SLA</span>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(HandoffNodeComponent);
