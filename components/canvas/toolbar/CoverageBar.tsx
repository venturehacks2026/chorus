'use client';

import { useUIStore } from '@/stores/uiStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { BaseNodeData } from '@/lib/types';

export default function CoverageBar() {
  const activeOverlay = useUIStore((s) => s.activeOverlay);
  const nodes = useWorkflowStore((s) => s.nodes);

  if (activeOverlay !== 'coverage') return null;

  const asdNodes = nodes.filter((n) => n.type !== 'agent');
  const total = asdNodes.length;
  const gaps = asdNodes.filter((n) => (n.data as unknown as BaseNodeData)?.status === 'automation_gap').length;
  const automated = total - gaps;
  const pct = total > 0 ? Math.round((automated / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Coverage</span>
      <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className="text-xs font-mono font-semibold" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
        {pct}%
      </span>
      <span className="text-[10px] text-gray-400">
        {automated}/{total} automated
      </span>
    </div>
  );
}
