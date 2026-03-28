'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Loader2, Trash2, ExternalLink, Mic, MicOff, Plus, FileText, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Workflow, WorkflowStatus, AgentNodeData } from '@/lib/types';
import type { SourceType } from '@/lib/knowledge-types';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/cn';
import SOPDocumentCard from '@/components/knowledge/SOPDocumentCard';

// Load ReactFlow canvas lazily (client-only)
const WorkflowCanvas = dynamic(() => import('./canvas/WorkflowCanvas'), { ssr: false });

const STATUS_COLOR: Record<WorkflowStatus, string> = {
  draft:     'bg-gray-100 text-gray-500',
  running:   'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-red-50 text-red-600',
};

interface SopListRow {
  id: string;
  title: string;
  source_type: SourceType;
  created_at: string;
  extracted_text?: string;
}


interface StreamEvent {
  type: 'created' | 'agent' | 'done' | 'error';
  workflowId?: string;
  agent?: AgentNodeData;
  graph?: unknown;
  message?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [interimText, setInterimText] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builtWorkflowId, setBuiltWorkflowId] = useState<string | null>(null);
  const [listMode, setListMode] = useState(false);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { state: voiceState, error: voiceError, start: toggleVoice } = useVoiceInput({
    onTranscript: (text) => {
      setInterimText('');
      setPrompt(prev => prev ? `${prev} ${text}` : text);
      textareaRef.current?.focus();
    },
    onInterimTranscript: (text) => setInterimText(text),
  });

  // Use global workflow store so the canvas is live
  const addStreamedAgent = useWorkflowStore(s => s.addStreamedAgent);
  const addOutputNode = useWorkflowStore(s => s.addOutputNode);
  const loadGraph = useWorkflowStore(s => s.loadGraph);
  const initStreamingInput = useWorkflowStore(s => s.initStreamingInput);
  const nodes = useWorkflowStore(s => s.nodes);
  const resetExecution = useExecutionStore(s => s.reset);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const { data: sopRows = [] } = useQuery<SopListRow[]>({
    queryKey: ['sop-documents'],
    queryFn: async () => {
      const res = await fetch('/api/sop-documents');
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  function toggleSop(id: string) {
    setSelectedSopId(prev => prev === id ? null : id);
  }

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
    setBuiltWorkflowId(null);
    setBuildError(null);
    resetExecution();
    loadGraph('__building__', { agents: [], edges: [] });

    abortRef.current = new AbortController();

    try {
      const selectedSop = selectedSopId ? sopRows.find(s => s.id === selectedSopId) : null;
      const res = await fetch('/api/workflows/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: autoName,
          nl_prompt: trimmed,
          context_sop: selectedSop?.extracted_text ?? undefined,
        }),
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
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const chunk of parts) {
          const line = chunk.replace(/^data:\s*/, '').trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === 'created' && event.workflowId) {
              workflowId = event.workflowId;
              setBuiltWorkflowId(workflowId);
              initStreamingInput(trimmed);
            }

            if (event.type === 'agent' && event.agent) {
              // Add node directly into the live canvas
              addStreamedAgent(event.agent);
            }

            if (event.type === 'done') {
              addOutputNode();
              qc.invalidateQueries({ queryKey: ['workflows'] });
              setBuilding(false);
              setPrompt('');
              setName('');
              setSelectedSopId(null);
              // Persist canvas state after output node is added
              setTimeout(() => {
                if (workflowId) {
                  const canvas = useWorkflowStore.getState().getCanvasJson();
                  fetch(`/api/workflows/${workflowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ canvas_json: canvas }),
                  }).catch(() => {});
                  router.push(`/workflows/${workflowId}`);
                }
              }, 400);
            }

            if (event.type === 'error') {
              setBuildError(event.message ?? 'Unknown error');
              setBuilding(false);
            }
          } catch {
            // ignore partial chunk parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setBuildError(String(err));
      }
      setBuilding(false);
    }
  }, [prompt, name, building, router, qc, addStreamedAgent, addOutputNode, loadGraph, initStreamingInput, resetExecution, selectedSopId, sopRows]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isBuilding = building;
  const showCanvas = isBuilding || (nodes.length > 0 && !!builtWorkflowId);

  return (
    <div className="flex flex-col h-full bg-white relative">

      <div className="absolute top-4 right-6 z-10">
        <button
          type="button"
          onClick={() => setListMode(m => !m)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all shadow-sm',
            listMode
              ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700'
              : 'bg-white border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/40',
          )}
        >
          {listMode ? (
            <><Plus className="w-3.5 h-3.5" /> Create</>
          ) : (
            <>
              Workflow List
              {workflows.length > 0 && (
                <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{workflows.length}</span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 relative overflow-hidden">
        {listMode ? (
          <div className="h-full overflow-y-auto px-8 pt-16 pb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Workflows</h2>
            <p className="text-xs text-gray-400 mb-6">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <p className="text-sm text-gray-400">No workflows yet.</p>
                <button type="button" onClick={() => setListMode(false)} className="text-xs text-violet-600 hover:underline">Create one</button>
              </div>
            ) : (
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
                    {workflows.map(wf => (
                      <tr key={wf.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-gray-900">
                          <Link href={`/workflows/${wf.id}`} className="hover:text-violet-600 transition-colors">{wf.name}</Link>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 max-w-xs truncate text-xs">{wf.nl_prompt ?? '—'}</td>
                        <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">{wf.graph_json?.agents?.length ?? 0}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', STATUS_COLOR[wf.status])}>
                            {wf.status.charAt(0).toUpperCase() + wf.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">{new Date(wf.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/workflows/${wf.id}`} className="text-xs font-medium text-violet-600 hover:text-violet-700">Open</Link>
                            <button
                              type="button"
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
            )}
          </div>
        ) : showCanvas ? (
          <div className="w-full h-full">
            <WorkflowCanvas readonly />
            {isBuilding && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-white border border-violet-100 shadow-lg rounded-xl px-4 py-2.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">
                  {nodes.length === 0
                    ? 'Designing workflow…'
                    : `${nodes.length} agent${nodes.length !== 1 ? 's' : ''} added — building…`}
                </span>
              </div>
            )}
            {!isBuilding && builtWorkflowId && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <Link
                  href={`/workflows/${builtWorkflowId}`}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-colors"
                >
                  Open workflow <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-8 pt-14 pb-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5 pb-4">
              {sopRows.map(sop => (
                <SOPDocumentCard
                  key={sop.id}
                  title={sop.title}
                  dateLabel={new Date(sop.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  sourceType={sop.source_type}
                  selected={selectedSopId === sop.id}
                  onClick={() => toggleSop(sop.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {!listMode && (
        <>
          {(buildError || voiceError) && (
            <div className="shrink-0 mx-8 mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-600">{buildError ?? voiceError}</p>
            </div>
          )}

          <div className="shrink-0 px-8 pt-2 pb-4 bg-white border-t border-gray-100 relative">
            {(selectedSopId != null || (prompt.trim().length > 0 && !building)) && (
              <div className="absolute bottom-full left-8 right-8 pb-2 flex flex-col gap-1.5 pointer-events-none">
                {selectedSopId != null && (() => {
                  const s = sopRows.find(r => r.id === selectedSopId);
                  return s ? (
                    <div className="flex flex-wrap gap-1.5 pointer-events-auto">
                      <span className="flex items-center gap-1 text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-1 shadow-sm">
                        <FileText className="w-2.5 h-2.5 shrink-0" />
                        <span className="max-w-[160px] truncate">{s.title}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSopId(null)}
                          className="ml-0.5 text-violet-400 hover:text-violet-700 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    </div>
                  ) : null;
                })()}
                {prompt.trim().length > 0 && !building && (
                  <div className="pointer-events-auto">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Name this workflow (optional)"
                      className="w-full text-xs px-3.5 py-2 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                    />
                  </div>
                )}
              </div>
            )}

        <div className={cn(
          'flex items-start gap-3 rounded-xl border bg-white px-4 transition-all',
          'focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-400',
          voiceState === 'listening' ? 'border-red-300 bg-red-50/20 ring-2 ring-red-200' :
          building ? 'border-violet-200 bg-violet-50/20' : 'border-gray-200 shadow-sm',
        )}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              voiceState === 'listening'
                ? interimText || 'Listening…'
                : 'Describe what you want to automate…'
            }
            rows={1}
            disabled={building}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm focus:outline-none py-3.5 leading-[1.5] disabled:opacity-40',
              voiceState === 'listening' && !prompt
                ? 'text-red-400 placeholder:text-red-300'
                : 'text-gray-900 placeholder:text-gray-400',
            )}
          />

          <div className="flex items-center gap-1.5 py-3">
            {/* Mic button — hidden if browser doesn't support Web Speech API */}
            {voiceState !== 'unsupported' && (
              <button
                onClick={toggleVoice}
                disabled={building}
                title={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
                className={cn(
                  'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  voiceState === 'listening'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                )}
              >
                {voiceState === 'listening'
                  ? <MicOff className="w-3.5 h-3.5" />
                  : <Mic className="w-3.5 h-3.5" />
                }
              </button>
            )}

            {/* Send button */}
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
        </div>

            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              {voiceState === 'listening'
                ? <span className="text-red-400 font-medium">● Recording — click mic to stop</span>
                : <><kbd className="font-mono">↵</kbd> to generate &nbsp;·&nbsp; <kbd className="font-mono">⇧↵</kbd> new line</>
              }
            </p>
          </div>
        </>
      )}
    </div>
  );
}
