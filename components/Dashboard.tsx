'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Workflow, WorkflowStatus } from '@/lib/types';
import { cn } from '@/lib/cn';
import NLInputModal from './NLInputModal';

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_COLOR: Record<WorkflowStatus, string> = {
  draft: 'text-text-subtle',
  running: 'text-sand-600',
  completed: 'text-emerald-700',
  failed: 'text-red-600',
};

export default function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: workflows = [], isLoading, isError } = useQuery<Workflow[]>({
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

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="px-8 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Agents</h1>
          <p className="text-sm text-text-muted mt-0.5">Describe a task to generate an agent pipeline.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-sand-400 hover:bg-sand-500 text-sand-900 text-sm font-medium rounded-md transition-colors"
        >
          New workflow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-4 h-4 border-2 border-border border-t-text-subtle rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-text-muted">fetch failed</p>
        )}

        {!isLoading && !isError && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="font-medium text-text">No workflows yet</p>
            <p className="text-sm text-text-muted mt-1 mb-5 max-w-xs">
              Describe a task in plain English and Chorus will build the agent pipeline.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-sand-400 hover:bg-sand-500 text-sand-900 text-sm font-medium rounded-md transition-colors"
            >
              New workflow
            </button>
          </div>
        )}

        {!isLoading && !isError && workflows.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Prompt</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Agents</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Created</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workflows.map((wf) => (
                  <tr key={wf.id} className="group hover:bg-bg-subtle transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/workflows/${wf.id}`} className="hover:underline underline-offset-2">
                        {wf.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted max-w-xs truncate">
                      {wf.nl_prompt ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted tabular-nums">
                      {wf.graph_json?.agents?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium', STATUS_COLOR[wf.status])}>
                        {STATUS_LABEL[wf.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted tabular-nums text-xs">
                      {new Date(wf.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/workflows/${wf.id}`}
                          className="text-xs text-text-muted hover:text-text transition-colors"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => { if (confirm('Delete this workflow?')) del.mutate(wf.id); }}
                          className="text-xs text-text-muted hover:text-red-600 transition-colors"
                        >
                          Delete
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
