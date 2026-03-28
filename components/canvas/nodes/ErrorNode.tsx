'use client';

import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import BaseNode from './BaseNode';
import type { ErrorNodeData } from '@/lib/types';

const COLOR = '#B86B6B'; // muted terra cotta

function ErrorNodeComponent({ data, selected }: NodeProps) {
  return (
    <BaseNode nodeType="error" color={COLOR} icon={<AlertTriangle className="w-3.5 h-3.5" />} selected={selected} data={data as unknown as ErrorNodeData} />
  );
}

export default memo(ErrorNodeComponent);
