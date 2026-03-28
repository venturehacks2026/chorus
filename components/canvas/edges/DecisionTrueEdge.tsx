'use client';

import { memo } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';

function DecisionTrueEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, id }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#6B8E6B', strokeWidth: 2, ...style }} markerEnd="url(#arrow-circle)" />
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }} className="nodrag">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">Yes</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(DecisionTrueEdge);
