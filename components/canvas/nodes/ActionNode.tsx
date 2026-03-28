'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import BaseNode from './BaseNode';
import type { ActionNodeData } from '@/lib/types';

const COLOR = '#8B7355'; // warm brown

function ActionNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ActionNodeData;
  return (
    <BaseNode nodeType="action" color={COLOR} icon={<Zap className="w-3.5 h-3.5" />} selected={selected} data={d}>
      {d.skillNodeId && (
        <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-sand-200 border border-sand-300 text-text-subtle font-mono">
          skill:{d.skillNodeId}
        </span>
      )}
    </BaseNode>
  );
}

export default memo(ActionNodeComponent);
