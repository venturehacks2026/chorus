'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import BaseNode from './BaseNode';
import type { StartNodeData } from '@/lib/types';

const COLOR = '#6B8E6B'; // sage green

function StartNodeComponent({ data, selected }: NodeProps) {
  return (
    <BaseNode nodeType="start" color={COLOR} icon={<Play className="w-3.5 h-3.5" />} selected={selected} data={data as unknown as StartNodeData} shape="pill" />
  );
}

export default memo(StartNodeComponent);
