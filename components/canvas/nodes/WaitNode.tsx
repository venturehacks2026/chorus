'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import BaseNode from './BaseNode';
import type { WaitNodeData } from '@/lib/types';

const COLOR = '#7EA3A3'; // dusty teal

function WaitNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as WaitNodeData;
  return (
    <BaseNode nodeType="wait" color={COLOR} icon={<Clock className="w-3.5 h-3.5" />} selected={selected} data={d}>
      <span className="mt-1 inline-block text-[10px] text-text-subtle font-mono">
        {d.waitType === 'timer' && d.durationMinutes ? `${d.durationMinutes}m` : d.waitType}
      </span>
    </BaseNode>
  );
}

export default memo(WaitNodeComponent);
