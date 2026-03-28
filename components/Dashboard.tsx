'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GitBranch, Loader2, Trash2, Clock, CheckCircle, XCircle, Play, ChevronRight } from 'lucide-react';
import type { Workflow, WorkflowStatus } from '@/lib/types';
import { cn } from '@/lib/cn';
import NLInputModal from './NLInputModal';

const statusConfig: Record<WorkflowStatus, { icon: React.ReactNode; label: string; color: string }> = {
  draft: { icon: <Clock className="w-3 h-3" />, label: 'Draft', color: 'text-text-subtle' },
  running: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Running', color: 'text-blue-400' },
  completed: { icon: <CheckCircle className="w-3 h-3" />, label: 'Completed', color: 'text-emerald-400' },
  failed: { icon: <XCircle className="w-3 h-3" />, label: 'Failed', color: 'text-red-400' },
};

export default function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => fetch('/api/workflows').then(r => r.json()),
  });

  const create = useMutation({
    mutationFn: (body: { name: string; nl_prompt: string }) =>
      fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workflows'] });
      if (data.workflow?.id) router.push(`/workflows/${data.workflow.id}`);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/workflows/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  });

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Orchestrate AI agents with natural language
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-sand-400 hover:bg-sand-500 rounded-lg text-sm font-medium text-sand-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New workflow
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 text-text-subtle animate-spin" />
          </div>
        )}

        {!isLoading && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 rounded-2xl bg-bg-muted border border-border flex items-center justify-center mb-4">
              <GitBranch className="w-5 h-5 text-text-subtle" />
            </div>
            <p className="font-medium text-text">No workflows yet</p>
            <p className="text-sm text-text-subtle mt-1 mb-6 max-w-xs">
              Describe a task in plain English and Chorus will build the agent pipeline.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-sand-400 hover:bg-sand-500 rounded-lg text-sm font-medium text-sand-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create workflow
            </button>
          </div>
        )}

        {workflows.length > 0 && (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {workflows.map((wf) => {
              const s = statusConfig[wf.status];
              return (
                <div
                  key={wf.id}
                  className="group flex items-center gap-4 px-5 py-4 bg-bg-muted hover:bg-bg-subtle transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0">
                    <GitBranch className="w-4 h-4 text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="font-medium text-text hover:text-white truncate transition-colors"
                      >
                        {wf.name}
                      </Link>
                      <span className={cn('flex items-center gap-1 text-xs', s.color)}>
                        {s.icon}
                        {s.label}
                      </span>
                    </div>
                    <p className="text-sm text-text-subtle truncate mt-0.5">
                      {wf.nl_prompt ?? 'No description'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-text-subtle flex-shrink-0">
                    <span>{wf.graph_json?.agents?.length ?? 0} agents</span>
                    <span className="mx-2 text-border">·</span>
                    <span>{new Date(wf.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border text-text-subtle hover:text-text transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => { if (confirm('Delete?')) del.mutate(wf.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-text-subtle hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NLInputModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={(name, nl_prompt) => create.mutateAsync({ name, nl_prompt })}
        loading={create.isPending}
        error={create.error?.message}
      />
    </div>
  );
}
