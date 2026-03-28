'use client';

import { useState } from 'react';
import { Check, MessageCircleQuestion, Loader2 } from 'lucide-react';
import type { Clarification } from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

interface Props {
  clarification: Clarification;
  onResolve: (id: string, resolution: string) => void;
  isResolving: boolean;
}

export default function ClarificationItem({ clarification, onResolve, isResolving }: Props) {
  const [resolution, setResolution] = useState('');
  const isPending = clarification.status === 'pending';

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 space-y-2',
      isPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white',
    )}>
      <div className="flex items-start gap-2">
        <MessageCircleQuestion className={cn(
          'w-3.5 h-3.5 mt-0.5 shrink-0',
          isPending ? 'text-amber-500' : 'text-gray-400',
        )} />
        <p className="text-xs text-gray-900 leading-relaxed">{clarification.question}</p>
      </div>

      {clarification.context && (
        <p className="text-[11px] text-gray-400 leading-relaxed pl-5.5 italic">
          {clarification.context}
        </p>
      )}

      {clarification.status === 'resolved' && clarification.resolution && (
        <div className="flex items-start gap-2 pl-5.5">
          <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700">{clarification.resolution}</p>
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 pl-5.5">
          <input
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Type a resolution…"
            className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            onKeyDown={e => {
              if (e.key === 'Enter' && resolution.trim()) {
                onResolve(clarification.id, resolution.trim());
                setResolution('');
              }
            }}
          />
          <button
            onClick={() => {
              if (resolution.trim()) {
                onResolve(clarification.id, resolution.trim());
                setResolution('');
              }
            }}
            disabled={!resolution.trim() || isResolving}
            className={cn(
              'text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors',
              resolution.trim() && !isResolving
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            )}
          >
            {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Resolve'}
          </button>
        </div>
      )}
    </div>
  );
}
