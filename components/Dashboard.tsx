'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Loader2, Trash2 } from 'lucide-react';
import type { Workflow, WorkflowStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

const STATUS_COLOR: Record<WorkflowStatus, string> = {
  draft:     'bg-gray-100 text-gray-500',
  running:   'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-red-50 text-red-600',
};

const EXAMPLES = [
  'Research latest AI releases and write a comparison report',
  'Monitor competitor pricing and send a weekly summary',
  'Analyze support tickets and draft FAQ improvements',
  'Scrape job listings and extract key requirements',
];

export default function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const create = useMutation({
    mutationFn: (body: { name: string; nl_prompt: string }) =>
      fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      if (data.workflow?.id) router.push(`/workflows/${data.workflow.id}`);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || create.isPending) return;
    const autoName = name.trim() || trimmed.slice(0, 52) + (trimmed.length > 52 ? '…' : '');
    create.mutate({ name: autoName, nl_prompt: trimmed });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const hasWorkflows = workflows.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        ) : hasWorkflows ? (
          <div className="px-8 pt-8 pb-4">
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Prompt</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Agents</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        <Link href={`/workflows/${wf.id}`} className="hover:text-violet-600 transition-colors">
                          {wf.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 max-w-xs truncate text-xs">
                        {wf.nl_prompt ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">
                        {wf.graph_json?.agents?.length ?? 0}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', STATUS_COLOR[wf.status])}>
                          {wf.status.charAt(0).toUpperCase() + wf.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">
                        {new Date(wf.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/workflows/${wf.id}`} className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors">
                            Open
                          </Link>
                          <button
                            onClick={() => { if (confirm('Delete this workflow?')) del.mutate(wf.id); }}
                            className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty — just the example pills, vertically centered */
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-28 select-none">
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                  className="text-xs px-3.5 py-2 rounded-full border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/60 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-8 py-5 bg-white">
        {prompt.trim().length > 0 && (
          <div className="mb-2.5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name this workflow (optional)"
              className="w-full text-xs px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>
        )}

        <div className={cn(
          'flex items-center gap-3 rounded-xl border bg-white px-4 transition-all',
          'focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400',
          'border-gray-200 shadow-sm',
        )}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what you want to automate…"
            rows={1}
            disabled={create.isPending}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-3.5 leading-[1.5] disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || create.isPending}
            className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              prompt.trim() && !create.isPending
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            )}
          >
            {create.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ArrowUp className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mt-2 text-center">
          <kbd className="font-mono">↵</kbd> to generate &nbsp;·&nbsp; <kbd className="font-mono">⇧↵</kbd> new line
        </p>
      </div>
    </div>
  );
}
