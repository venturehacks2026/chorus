'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { AgentNodeData, AgentTool, Connector } from '@/lib/types';

const MODELS = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export default function AgentConfigPanel() {
  const selectedId = useWorkflowStore((s) => s.selectedAgentId);
  const getSelected = useWorkflowStore((s) => s.getSelectedAgent);
  const updateAgentData = useWorkflowStore((s) => s.updateAgentData);

  const { data: connectors = [] } = useQuery<Connector[]>({
    queryKey: ['connectors'],
    queryFn: () => fetch('/api/connectors').then(r => r.json()),
  });

  const agent = getSelected() as AgentNodeData | null;
  const [form, setForm] = useState<Partial<AgentNodeData>>({});

  useEffect(() => { if (agent) setForm(agent); }, [selectedId]);

  if (!selectedId || !agent) {
    return (
      <div className="w-72 border-l border-border bg-bg-subtle flex items-center justify-center text-xs text-text-subtle px-4 text-center">
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

  const unusedConnectors = connectors.filter(c => !(form.tools ?? []).some(t => t.connector_id === c.slug));

  return (
    <div className="w-72 border-l border-border bg-bg-subtle flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <span className="text-sm font-medium">Agent config</span>
        <button onClick={save} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover rounded-md text-xs text-white font-medium transition-colors">
          <Save className="w-3 h-3" />Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {(['name', 'role'] as const).map(field => (
          <div key={field}>
            <label className="block text-xs text-text-subtle mb-1.5 capitalize">{field}</label>
            <input
              value={(form[field] as string) ?? ''}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs text-text-subtle mb-1.5">Model</label>
          <select
            value={form.model ?? 'claude-opus-4-5'}
            onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
          >
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-subtle mb-1.5">System prompt</label>
          <textarea
            value={form.system_prompt ?? ''}
            onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            rows={6}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs text-text-subtle mb-2">Tools</label>
          {(form.tools ?? []).map(t => (
            <div key={t.id} className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 text-xs bg-bg border border-border px-2.5 py-1.5 rounded-md text-text-muted font-mono truncate">{t.connector_id}</span>
              <button onClick={() => removeTool(t.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-text-subtle hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {unusedConnectors.length > 0 && (
            <select value="" onChange={e => e.target.value && addTool(e.target.value)}
              className="w-full mt-1 bg-bg border border-dashed border-border rounded-md px-3 py-2 text-xs text-text-subtle focus:outline-none">
              <option value="">+ Add tool</option>
              {unusedConnectors.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
