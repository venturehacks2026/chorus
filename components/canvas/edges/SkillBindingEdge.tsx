'use client';

import { memo } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

function SkillBindingEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, ...rest }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: '#7A9E8E', strokeWidth: 1.5, strokeDasharray: '4 2 1 2', ...style }} markerEnd="url(#arrow-hex)" {...rest} />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
    </>
  );
}

export default memo(SkillBindingEdge);
