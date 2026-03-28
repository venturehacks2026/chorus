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
  'Research the latest AI model releases and write a comparison report',
  'Monitor competitor pricing and send a weekly Slack summary',
  'Analyze support tickets and draft FAQ improvements',
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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [prompt]);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || create.isPending) return;
    const autoName = name.trim() || trimmed.slice(0, 48) + (trimmed.length > 48 ? '…' : '');
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
    <div className="flex flex-col h-full bg-bg">

      {/* ── Header ── */}
      <div className="px-8 py-4 border-b border-border shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-bold tracking-tight">Agents</h1>
          <p className="text-xs text-text-muted mt-0.5">Build agent pipelines from plain English</p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-text-subtle animate-spin" />
          </div>
        ) : hasWorkflows ? (
          /* Workflow list */
          <div className="px-8 py-6">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-subtle border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Prompt</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Agents</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {workflows.map((wf) => (
                    <tr key={wf.id} className="group hover:bg-bg-subtle transition-colors">
                      <td className="px-4 py-3.5 font-medium">
                        <Link href={`/workflows/${wf.id}`} className="hover:text-accent transition-colors">
                          {wf.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-text-muted max-w-xs truncate text-xs">
                        {wf.nl_prompt ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted tabular-nums text-xs">
                        {wf.graph_json?.agents?.length ?? 0}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', STATUS_COLOR[wf.status])}>
                          {wf.status.charAt(0).toUpperCase() + wf.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-text-muted tabular-nums text-xs">
                        {new Date(wf.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/workflows/${wf.id}`}
                            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                          >
                            Open
                          </Link>
                          <button
                            onClick={() => { if (confirm('Delete this workflow?')) del.mutate(wf.id); }}
                            className="p-1 rounded-md text-text-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
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
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full pb-32 px-6 text-center select-none">
            <div className="w-10 h-10 rounded-2xl bg-accent-muted flex items-center justify-center mb-4">
              <span className="text-accent text-lg font-bold">C</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1">What should Chorus build?</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Describe a task below and Chorus will generate an agent pipeline to run it.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-text-muted hover:border-accent/40 hover:text-accent hover:bg-accent-muted transition-all"
                >
                  {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Chat bar ── */}
      <div className="shrink-0 px-8 py-4 border-t border-border bg-bg">
        {/* Optional name row */}
        {prompt.trim().length > 0 && (
          <div className="mb-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name (optional — auto-generated if blank)"
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-subtle text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
            />
          </div>
        )}

        <div className="flex items-end gap-3 bg-bg-subtle border border-border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/50 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what you want this agent pipeline to do…"
            rows={1}
            disabled={create.isPending}
            className="flex-1 resize-none bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none leading-relaxed disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || create.isPending}
            className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              prompt.trim() && !create.isPending
                ? 'bg-accent hover:bg-accent-hover text-white shadow-sm'
                : 'bg-bg-muted text-text-subtle cursor-not-allowed',
            )}
          >
            {create.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ArrowUp className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-[11px] text-text-subtle mt-1.5 text-center">
          Press <kbd className="font-mono bg-bg-muted px-1 rounded">Enter</kbd> to generate · <kbd className="font-mono bg-bg-muted px-1 rounded">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
