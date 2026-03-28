'use client';

import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function HandoffEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, id }: EdgeProps) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#9E8B9E', strokeWidth: 2, strokeDasharray: '12 6', ...style }} markerEnd="url(#arrow-person)" />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
    </>
  );
}

export default memo(HandoffEdge);
