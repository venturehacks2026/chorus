'use client';

import { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { Contract } from '@/lib/types';

const INPUT = 'w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all';

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, agent_id: selectedId, ...form, sequence: contracts.length }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedId] });
      setShowForm(false);
      setForm({ description: '', judge_prompt: '', blocking: false });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/contracts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedId] }),
  });

  if (!selectedId) {
    return (
      <div className="w-72 border-l border-gray-100 bg-gray-50/40 flex items-center justify-center text-xs text-gray-400 px-6 text-center">
        Select an agent to manage contracts
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-gray-100 bg-gray-50/40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-900">Contracts</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md font-medium">{contracts.length}</span>
        </div>
        <button
          onClick={() => setShowForm(x => !x)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs text-white font-medium transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5 shadow-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Check</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Did the agent summarize the content?"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Judge prompt</label>
              <textarea
                value={form.judge_prompt}
                onChange={e => setForm(f => ({ ...f, judge_prompt: e.target.value }))}
                rows={3}
                placeholder="Verify that the output includes…"
                className={`${INPUT} resize-none`}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.blocking}
                onChange={e => setForm(f => ({ ...f, blocking: e.target.checked }))}
                className="rounded border-gray-300 accent-violet-600"
              />
              <span className="text-xs text-gray-500">Blocking — halt on failure</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => create.mutate()}
                disabled={!form.description || !form.judge_prompt}
                className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg text-xs text-white font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs text-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {contracts.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 text-center mt-8">No contracts yet. Add one to validate outputs.</p>
        )}

        {contracts.map((c: Contract) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900">{c.description}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.judge_prompt}</p>
                {c.blocking && (
                  <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-md font-medium">
                    Blocking
                  </span>
                )}
              </div>
              <button
                onClick={() => del.mutate(c.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
