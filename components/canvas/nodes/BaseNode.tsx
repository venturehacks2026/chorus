'use client';

import { type ReactNode, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/cn';
import type { BaseNodeData, ExecutionNodeState, ContractOverlay } from '@/lib/types';
import { useUIStore } from '@/stores/uiStore';
import ContractSuggestionTooltip from './ContractSuggestionTooltip';

interface BaseNodeProps {
  nodeType: string;
  color: string;
  icon: ReactNode;
  selected?: boolean;
  data: BaseNodeData;
  children?: ReactNode;
  shape?: 'default' | 'pill' | 'diamond' | 'dashed' | 'hexagon';
}

const SHAPE_CLASSES: Record<string, string> = {
  default: 'rounded-lg',
  pill: 'rounded-full px-6 text-center',
  diamond: 'rounded-lg [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)] px-8 py-6 text-center',
  dashed: 'rounded-lg border-dashed',
  hexagon: 'rounded-lg',
};

function ContractBadge({ contracts }: { contracts: ContractOverlay[] }) {
  const active = contracts.filter((c) => c.state === 'active');
  if (active.length === 0) return null;
  return (
    <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-sand-400 text-sand-900 text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
      {active.length}
    </div>
  );
}

function ExecutionIndicator({ state }: { state?: ExecutionNodeState }) {
  if (!state) return null;
  const badge = {
    pending: null,
    active: <span className="w-2 h-2 rounded-full bg-sand-500 animate-pulse" />,
    completed: <span className="w-2 h-2 rounded-full bg-emerald-600" />,
    failed: <span className="w-2 h-2 rounded-full bg-red-500" />,
    skipped: <span className="w-2 h-2 rounded-full bg-text-subtle" />,
  }[state.phase];
  if (!badge) return null;
  return <div className="absolute -top-1.5 -left-1.5">{badge}</div>;
}

function StatusBadge({ status }: { status: BaseNodeData['status'] }) {
  if (status === 'complete') return null;
  const config = {
    needs_clarification: { label: '?', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    automation_gap: { label: 'GAP', className: 'bg-sand-200 text-sand-700 border-sand-300' },
  }[status];
  return (
    <span className={cn('absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded border', config.className)}>
      {config.label}
    </span>
  );
}

export default function BaseNode({ nodeType, color, icon, selected, data, children, shape = 'default' }: BaseNodeProps) {
  const [hovered, setHovered] = useState(false);
  const activeOverlay = useUIStore((s) => s.activeOverlay);
  const highlightedNodeIds = useUIStore((s) => s.highlightedNodeIds);
  const isHighlighted = highlightedNodeIds.length > 0;

  const contractCount = data.contracts?.filter((c) => c.state === 'active').length ?? 0;
  const heatmapIntensity = activeOverlay === 'heatmap' ? Math.min(contractCount / 5, 1) : 0;

  const isGap = activeOverlay === 'coverage' && data.status === 'automation_gap';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative bg-bg-subtle border min-w-[180px] px-4 py-3 shadow-sm transition-all duration-200 cursor-pointer select-none',
        SHAPE_CLASSES[shape],
        selected ? 'ring-2 ring-sand-400 shadow-md' : 'hover:shadow-md',
        data.executionState?.phase === 'active' && 'ring-2 ring-sand-500 animate-pulse',
        data.executionState?.phase === 'failed' && 'ring-2 ring-red-400',
        isGap && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#E3D5CA_4px,#E3D5CA_6px)]',
        isHighlighted && !highlightedNodeIds.includes(nodeType) && 'opacity-40',
      )}
      style={{
        borderColor: selected ? color : '#D6CCC2',
        borderLeftWidth: shape === 'default' || shape === 'dashed' || shape === 'hexagon' ? '3px' : undefined,
        borderLeftColor: shape === 'default' || shape === 'dashed' || shape === 'hexagon' ? color : undefined,
        boxShadow: heatmapIntensity > 0 ? `0 0 ${8 + heatmapIntensity * 16}px ${color}${Math.round(heatmapIntensity * 40).toString(16).padStart(2, '0')}` : undefined,
      }}
    >
      <ExecutionIndicator state={data.executionState} />
      <ContractBadge contracts={data.contracts ?? []} />
      <StatusBadge status={data.status} />

      {shape !== 'pill' && shape !== 'diamond' && (
        <>
          <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-sand-400 !border-bg-subtle" />
          <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-sand-400 !border-bg-subtle" />
        </>
      )}
      {(shape === 'pill' || shape === 'diamond') && (
        <>
          <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-sand-400 !border-bg-subtle" />
          <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-sand-400 !border-bg-subtle" />
        </>
      )}

      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{data.label}</p>
          {data.description && shape !== 'pill' && shape !== 'diamond' && (
            <p className="text-xs text-text-subtle mt-0.5 truncate">{data.description}</p>
          )}
          {children}
        </div>
      </div>

      {data.confidenceScore < 0.8 && data.confidenceScore > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-sand-200 overflow-hidden">
            <div className="h-full rounded-full bg-sand-400" style={{ width: `${data.confidenceScore * 100}%` }} />
          </div>
          <span className="text-[9px] font-mono text-text-subtle">{Math.round(data.confidenceScore * 100)}%</span>
        </div>
      )}

      {hovered && (data.hasComplianceLanguage || (data.suggestedContracts && data.suggestedContracts.length > 0)) && (
        <ContractSuggestionTooltip data={data} />
      )}
    </div>
  );
}
