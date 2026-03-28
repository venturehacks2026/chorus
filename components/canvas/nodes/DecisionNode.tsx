'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import BaseNode from './BaseNode';
import type { DecisionNodeData } from '@/lib/types';

const COLOR = '#C49A6C'; // golden sand

function DecisionNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as DecisionNodeData;
  return (
    <BaseNode nodeType="decision" color={COLOR} icon={<GitBranch className="w-3.5 h-3.5" />} selected={selected} data={d}>
      {d.condition && (
        <p className="text-[10px] text-text-muted mt-1 font-mono truncate">{d.condition}</p>
      )}
    </BaseNode>
  );
}

export default memo(DecisionNodeComponent);
