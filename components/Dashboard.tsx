'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Loader2, Trash2, Bot, ArrowRight } from 'lucide-react';
import type { Workflow, WorkflowStatus, AgentNodeData } from '@/lib/types';
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

interface StreamEvent {
  type: 'created' | 'agent' | 'done' | 'error';
  workflowId?: string;
  agent?: AgentNodeData;
  graph?: unknown;
  message?: string;
}

// Small live preview of streaming agents
function BuildingPreview({ agents }: { agents: AgentNodeData[] }) {
  if (agents.length === 0) return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
      <span>Designing workflow…</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {agents.map((a, i) => (
        <div key={a.id} className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 animate-fade-in">
            <Bot className="w-3 h-3 text-violet-400 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-violet-700 leading-none">{a.name}</p>
              <p className="text-[10px] text-violet-400 leading-none mt-0.5 truncate max-w-[120px]">{a.role}</p>
            </div>
          </div>
          {i < agents.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
          {i === agents.length - 1 && (
            <div className="w-5 h-5 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-gray-300 animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState(false);
  const [streamedAgents, setStreamedAgents] = useState<AgentNodeData[]>([]);
  const [buildError, setBuildError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
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

  const handleSubmit = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || building) return;

    const autoName = name.trim() || trimmed.slice(0, 52) + (trimmed.length > 52 ? '…' : '');

    setBuilding(true);
    setStreamedAgents([]);
    setBuildError(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/workflows/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: autoName, nl_prompt: trimmed }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setBuildError('Failed to start stream');
        setBuilding(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let workflowId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';

        for (const chunk of lines) {
          const line = chunk.replace(/^data:\s*/, '').trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === 'created' && event.workflowId) {
              workflowId = event.workflowId;
            }

            if (event.type === 'agent' && event.agent) {
              setStreamedAgents(prev => [...prev, event.agent!]);
            }

            if (event.type === 'done') {
              qc.invalidateQueries({ queryKey: ['workflows'] });
              setBuilding(false);
              setPrompt('');
              setName('');
              if (workflowId) router.push(`/workflows/${workflowId}`);
            }

            if (event.type === 'error') {
              setBuildError(event.message ?? 'Unknown error');
              setBuilding(false);
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setBuildError(String(err));
      }
      setBuilding(false);
    }
  }, [prompt, name, building, router, qc]);

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

      {/* ── Build preview banner ── */}
      {building && (
        <div className="shrink-0 mx-8 mb-3 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
          <BuildingPreview agents={streamedAgents} />
        </div>
      )}

      {buildError && (
        <div className="shrink-0 mx-8 mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600">{buildError}</p>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 px-8 py-5 bg-white">
        {prompt.trim().length > 0 && !building && (
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
          building ? 'border-violet-200 bg-violet-50/30' : 'border-gray-200 shadow-sm',
        )}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Describe what you want to automate…"
            rows={1}
            disabled={building}
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-3.5 leading-[1.5] disabled:opacity-40"
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || building}
            className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
              prompt.trim() && !building
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            )}
          >
            {building
              ? <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
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
