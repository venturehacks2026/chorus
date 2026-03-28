'use client';

import { memo } from 'react';
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react';

function ErrorEdge({ sourceX, sourceY, targetX, targetY, style, ...rest }: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: '#B86B6B', strokeWidth: 1, strokeDasharray: '3 3', ...style }} markerEnd="url(#arrow-x)" {...rest} />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
    </>
  );
}

export default memo(ErrorEdge);
