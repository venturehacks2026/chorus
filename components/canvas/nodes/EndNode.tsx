'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';
import BaseNode from './BaseNode';
import type { EndNodeData } from '@/lib/types';

const COLOR = '#A68B6B'; // warm stone

function EndNodeComponent({ data, selected }: NodeProps) {
  return (
    <BaseNode nodeType="end" color={COLOR} icon={<Square className="w-3.5 h-3.5" />} selected={selected} data={data as unknown as EndNodeData} shape="pill" />
  );
}

export default memo(EndNodeComponent);
