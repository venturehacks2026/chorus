'use client';

import { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';

function DecisionFalseEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, ...rest }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: '#B86B6B', strokeWidth: 2, strokeDasharray: '8 4', ...style }} markerEnd="url(#arrow-open)" {...rest} />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }} className="nodrag">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">No</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(DecisionFalseEdge);
