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
    <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5">
      {OVERLAYS.map(({ mode, icon: Icon, label, tooltip }) => (
        <button
          key={mode}
          onClick={() => toggleOverlay(mode)}
          title={tooltip}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            activeOverlay === mode
              ? 'bg-violet-50 text-violet-700'
              : 'text-gray-500 hover:text-gray-900',
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
