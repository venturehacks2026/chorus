'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Sparkles, CheckCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { AgentNodeData, AgentTool, Connector } from '@/lib/types';

const MODELS = [
  { value: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 (default)' },
  { value: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-5-20251001',   label: 'Claude Opus 4.5' },
];

const INPUT = 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all';

export default function AgentConfigPanel() {
  const params = useParams<{ id: string }>();
  const workflowId = params?.id;
  const qc = useQueryClient();

  const selectedId = useWorkflowStore((s) => s.selectedAgentId);
  const getSelected = useWorkflowStore((s) => s.getSelectedAgent);
  const updateAgentData = useWorkflowStore((s) => s.updateAgentData);

  const { data: connectors = [] } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: () => fetch('/api/connectors').then(r => r.json()),
  });

  const agent = getSelected() as AgentNodeData | null;
  const [form, setForm] = useState<Partial<AgentNodeData>>({});
  const [generatingContracts, setGeneratingContracts] = useState(false);
  const [contractsGenerated, setContractsGenerated] = useState(false);

  useEffect(() => {
    if (agent) setForm(agent);
    setContractsGenerated(false);
  }, [selectedId]);

  if (!selectedId || !agent) {
    return (
      <div className="h-full border-l border-gray-100 bg-gray-50/50 flex items-center justify-center text-xs text-gray-400 px-6 text-center">
        Click an agent to configure it
      </div>
    );
  }

  function save() {
    if (!selectedId) return;
    updateAgentData(selectedId, form as Partial<AgentNodeData>);
  }

  function addTool(slug: string) {
    const c = connectors.find(x => x.slug === slug);
    if (!c) return;
    const t: AgentTool = { id: `t-${Date.now()}`, connector_id: slug, label: c.name, config: {} };
    setForm(f => ({ ...f, tools: [...(f.tools ?? []), t] }));
  }

  function removeTool(tid: string) {
    setForm(f => ({ ...f, tools: (f.tools ?? []).filter(t => t.id !== tid) }));
  }

  async function generateContracts() {
    if (!workflowId || !selectedId || generatingContracts) return;
    setGeneratingContracts(true);
    try {
      await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflowId,
          agent_id: selectedId,
          agent_name: (form.name as string) ?? '',
          agent_role: (form.role as string) ?? '',
          system_prompt: (form.system_prompt as string) ?? '',
          tools: (form.tools as AgentTool[] ?? []).map(t => t.connector_id),
        }),
      });
      qc.invalidateQueries({ queryKey: ['contracts', workflowId, selectedId] });
      setContractsGenerated(true);
    } finally {
      setGeneratingContracts(false);
    }
  }

  const unusedConnectors = connectors.filter(c => !(form.tools ?? []).some(t => t.connector_id === c.slug));

  return (
    <div className="h-full border-l border-gray-100 bg-gray-50/40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 bg-white">
        <span className="text-sm font-semibold text-gray-900">Agent config</span>
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs text-white font-medium transition-colors shadow-sm"
        >
          <Save className="w-3 h-3" /> Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {(['name', 'role'] as const).map(field => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 capitalize">{field}</label>
            <input
              value={(form[field] as string) ?? ''}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className={INPUT}
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Model</label>
          <select
            value={form.model ?? 'claude-haiku-4-5-20251001'}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            className={INPUT}
          >
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">System prompt</label>
          <textarea
            value={form.system_prompt ?? ''}
            onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            rows={6}
            className={`${INPUT} resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Tools</label>
          {(form.tools ?? []).map(t => (
            <div key={t.id} className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 text-xs bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-gray-500 font-mono truncate">{t.connector_id}</span>
              <button
                onClick={() => removeTool(t.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {unusedConnectors.length > 0 && (
            <select
              value=""
              onChange={e => e.target.value && addTool(e.target.value)}
              className="w-full mt-1 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-violet-400"
            >
              <option value="">+ Add tool</option>
              {unusedConnectors.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
        </div>

        {/* Auto-generate contracts */}
        {workflowId && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={generateContracts}
              disabled={generatingContracts}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-violet-200 text-xs text-violet-600 hover:bg-violet-50 hover:border-violet-300 transition-all disabled:opacity-50"
            >
              {contractsGenerated
                ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Contracts generated</>
                : generatingContracts
                  ? <><span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> Generating contracts…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Auto-generate contracts</>
              }
            </button>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              AI writes behavioral contracts for this agent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
