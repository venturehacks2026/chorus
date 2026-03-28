'use client';

import { Flame, BarChart3 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/cn';

const OVERLAYS = [
  { mode: 'heatmap' as const, icon: Flame, label: 'Contracts', tooltip: 'Contract heatmap — glow intensity = contract density' },
  { mode: 'coverage' as const, icon: BarChart3, label: 'Coverage', tooltip: 'Automation coverage — hatched = manual gap' },
] as const;

export default function OverlayToggle() {
  const activeOverlay = useUIStore((s) => s.activeOverlay);
  const toggleOverlay = useUIStore((s) => s.toggleOverlay);

  return (
    <div className="flex items-center gap-0.5 bg-bg border border-border rounded-md p-0.5">
      {OVERLAYS.map(({ mode, icon: Icon, label, tooltip }) => (
        <button
          key={mode}
          onClick={() => toggleOverlay(mode)}
          title={tooltip}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
            activeOverlay === mode
              ? 'bg-sand-400/20 text-sand-700'
              : 'text-text-muted hover:text-text',
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
