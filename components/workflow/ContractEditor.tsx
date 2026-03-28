'use client';

import { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { Contract } from '@/lib/types';

export default function ContractEditor({ workflowId }: { workflowId: string }) {
  const selectedId = useWorkflowStore((s) => s.selectedAgentId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', judge_prompt: '', blocking: false });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts', workflowId, selectedId],
    queryFn: () => fetch(`/api/contracts?workflow_id=${workflowId}&agent_id=${selectedId}`).then(r => r.json()),
    enabled: !!selectedId,
  });

  const create = useMutation({
    mutationFn: () => fetch('/api/contracts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, agent_id: selectedId, ...form, sequence: contracts.length }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedId] }); setShowForm(false); setForm({ description: '', judge_prompt: '', blocking: false }); },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/contracts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedId] }),
  });

  if (!selectedId) {
    return (
      <div className="w-72 border-l border-border bg-bg-subtle flex items-center justify-center text-xs text-text-subtle px-4 text-center">
        Select an agent to manage contracts
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-border bg-bg-subtle flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium">Contracts</span>
          <span className="text-xs text-text-subtle bg-border px-1.5 py-0.5 rounded">{contracts.length}</span>
        </div>
        <button onClick={() => setShowForm(x => !x)} className="flex items-center gap-1 px-2.5 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-xs text-white transition-colors">
          <Plus className="w-3 h-3" />Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {showForm && (
          <div className="bg-bg border border-border rounded-xl p-3 space-y-3">
            <div>
              <label className="block text-xs text-text-subtle mb-1">Check</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Did the agent summarize the content?" className="w-full bg-input border border-input-border rounded-lg px-2.5 py-2 text-xs text-text focus:outline-none focus:border-input-focus" />
            </div>
            <div>
              <label className="block text-xs text-text-subtle mb-1">Judge prompt</label>
              <textarea value={form.judge_prompt} onChange={e => setForm(f => ({ ...f, judge_prompt: e.target.value }))}
                rows={3} placeholder="Verify that the output includes…" className="w-full bg-bg-subtle border border-border rounded-lg px-2.5 py-2 text-xs text-text focus:outline-none focus:border-accent/50 resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.blocking} onChange={e => setForm(f => ({ ...f, blocking: e.target.checked }))} className="rounded border-border" />
              <span className="text-xs text-text-subtle">Blocking — halt on failure</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => create.mutate()} disabled={!form.description || !form.judge_prompt} className="flex-1 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 rounded-lg text-xs text-white font-medium transition-colors">Save</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-border hover:bg-border rounded-lg text-xs text-text-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {contracts.length === 0 && !showForm && (
          <p className="text-xs text-text-subtle text-center mt-8">No contracts. Add one to validate outputs.</p>
        )}

        {contracts.map((c: Contract) => (
          <div key={c.id} className="bg-bg border border-border rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text">{c.description}</p>
                <p className="text-xs text-text-subtle mt-1 line-clamp-2">{c.judge_prompt}</p>
                {c.blocking && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded">Blocking</span>}
              </div>
              <button onClick={() => del.mutate(c.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-text-subtle hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
