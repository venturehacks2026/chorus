import { useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { Contract } from 'chorus-shared';
import { cn } from '@/lib/cn';

interface Props {
  workflowId: string;
}

export default function ContractEditor({ workflowId }: Props) {
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', judge_prompt: '', blocking: false });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', workflowId, selectedAgentId],
    queryFn: () => api.contracts.list(workflowId, selectedAgentId ?? undefined),
    enabled: !!selectedAgentId,
  });

  const create = useMutation({
    mutationFn: () =>
      api.contracts.create({
        workflow_id: workflowId,
        agent_id: selectedAgentId!,
        description: form.description,
        judge_prompt: form.judge_prompt,
        sequence: contracts.length,
        blocking: form.blocking,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedAgentId] });
      setForm({ description: '', judge_prompt: '', blocking: false });
      setShowForm(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.contracts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedAgentId] }),
  });

  if (!selectedAgentId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm px-4 text-center">
        Select an agent to manage its contracts
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-node-bg border-l border-node-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-node-border">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-white">Contracts</h3>
          <span className="text-xs text-gray-500 bg-node-border px-1.5 py-0.5 rounded">
            {contracts.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-xs text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {showForm && (
          <div className="bg-black/30 border border-node-border rounded-xl p-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Did the agent summarize the document?"
                className="w-full bg-black/40 border border-node-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Judge Prompt</label>
              <textarea
                value={form.judge_prompt}
                onChange={(e) => setForm((f) => ({ ...f, judge_prompt: e.target.value }))}
                placeholder="Verify that the agent produced a summary of at least 3 paragraphs covering the main topic..."
                rows={3}
                className="w-full bg-black/40 border border-node-border rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-accent resize-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.blocking}
                onChange={(e) => setForm((f) => ({ ...f, blocking: e.target.checked }))}
                className="rounded border-node-border"
              />
              <span className="text-xs text-gray-400">Blocking (halt on failure)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => create.mutate()}
                disabled={!form.description || !form.judge_prompt}
                className="flex-1 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-xs text-white font-medium transition-colors"
              >
                Save Contract
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-node-border hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {contracts.length === 0 && !showForm && (
          <p className="text-xs text-gray-600 text-center mt-8">
            No contracts yet. Add one to validate this agent's output.
          </p>
        )}

        {contracts.map((contract: Contract) => (
          <div key={contract.id} className="bg-black/20 border border-node-border rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200">{contract.description}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{contract.judge_prompt}</p>
                {contract.blocking && (
                  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                    Blocking
                  </span>
                )}
              </div>
              <button
                onClick={() => remove.mutate(contract.id)}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
