'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useExecutionStore } from '@/stores/executionStore';
import { cn } from '@/lib/cn';

interface ReplayEvent {
  id: string;
  type: string;
  nodeId?: string;
  timestamp: string;
  label: string;
}

interface Props {
  events: ReplayEvent[];
}

export default function ReplayScrubber({ events }: Props) {
  const replayMode = useUIStore((s) => s.replayMode);
  const replayIndex = useUIStore((s) => s.replayIndex);
  const replayPlaying = useUIStore((s) => s.replayPlaying);
  const replaySpeed = useUIStore((s) => s.replaySpeed);
  const setReplayMode = useUIStore((s) => s.setReplayMode);
  const setReplayIndex = useUIStore((s) => s.setReplayIndex);
  const setReplayPlaying = useUIStore((s) => s.setReplayPlaying);
  const setReplaySpeed = useUIStore((s) => s.setReplaySpeed);
  const executionStatus = useExecutionStore((s) => s.executionStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canReplay = executionStatus === 'completed' || executionStatus === 'failed';

  // Auto-advance when playing
  useEffect(() => {
    if (replayPlaying && replayMode && events.length > 0) {
      intervalRef.current = setInterval(() => {
        setReplayIndex(Math.min(replayIndex + 1, events.length - 1));
      }, 1000 / replaySpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [replayPlaying, replayMode, replayIndex, replaySpeed, events.length, setReplayIndex]);

  // Pause at end
  useEffect(() => {
    if (replayIndex >= events.length - 1 && replayPlaying) {
      setReplayPlaying(false);
    }
  }, [replayIndex, events.length, replayPlaying, setReplayPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!replayMode) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ') { e.preventDefault(); setReplayPlaying(!replayPlaying); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setReplayIndex(Math.max(0, replayIndex - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setReplayIndex(Math.min(events.length - 1, replayIndex + 1)); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [replayMode, replayPlaying, replayIndex, events.length, setReplayPlaying, setReplayIndex]);

  if (!canReplay) return null;

  if (!replayMode) {
    return (
      <button
        onClick={() => setReplayMode(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-subtle border border-border rounded-md text-xs font-medium text-text-muted hover:text-text transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        Replay
      </button>
    );
  }

  const currentEvent = events[replayIndex];
  const progress = events.length > 1 ? (replayIndex / (events.length - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-bg-subtle border border-border rounded-lg shadow-sm min-w-[480px]">
      {/* Controls */}
      <div className="flex items-center gap-1">
        <button onClick={() => setReplayIndex(0)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-sand-200 text-text-muted">
          <SkipBack className="w-3 h-3" />
        </button>
        <button
          onClick={() => setReplayPlaying(!replayPlaying)}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-sand-400 text-sand-900 hover:bg-sand-500"
        >
          {replayPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        <button onClick={() => setReplayIndex(Math.min(events.length - 1, replayIndex + 1))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-sand-200 text-text-muted">
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* Timeline bar */}
      <div className="flex-1 relative">
        <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            setReplayIndex(Math.round(pct * (events.length - 1)));
          }}
        >
          <div className="h-full rounded-full bg-sand-400 transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
        {/* Step markers */}
        <div className="flex justify-between mt-0.5">
          {events.map((evt, i) => (
            <button
              key={evt.id}
              onClick={() => setReplayIndex(i)}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                i <= replayIndex ? 'bg-sand-400' : 'bg-sand-200',
                i === replayIndex && 'w-2 h-2 bg-sand-500 ring-2 ring-sand-400/30',
              )}
            />
          ))}
        </div>
      </div>

      {/* Current event label */}
      <div className="min-w-[120px] text-right">
        <p className="text-[10px] font-mono text-text-subtle">{replayIndex + 1}/{events.length}</p>
        <p className="text-xs text-text truncate">{currentEvent?.label ?? '—'}</p>
      </div>

      {/* Speed control */}
      <select
        value={replaySpeed}
        onChange={(e) => setReplaySpeed(Number(e.target.value))}
        className="text-[10px] bg-bg border border-border rounded px-1.5 py-0.5 text-text-muted"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>

      {/* Exit */}
      <button
        onClick={() => setReplayMode(false)}
        className="text-[10px] text-text-subtle hover:text-text"
      >
        Exit
      </button>
    </div>
  );
}
