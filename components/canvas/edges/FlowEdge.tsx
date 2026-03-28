'use client';

import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function FlowEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, id }: EdgeProps) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#A68B6B', strokeWidth: 1.5, ...style }} markerEnd="url(#arrow-filled)" />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
    </>
  );
}

export default memo(FlowEdge);
