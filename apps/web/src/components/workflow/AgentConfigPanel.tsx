import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useConnectors } from '@/hooks/useConnectors';
import type { AgentNodeData, AgentTool } from 'chorus-shared';

const MODELS = [
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

export default function AgentConfigPanel() {
  const selectedAgentId = useWorkflowStore((s) => s.selectedAgentId);
  const getSelectedAgent = useWorkflowStore((s) => s.getSelectedAgent);
  const updateAgentData = useWorkflowStore((s) => s.updateAgentData);
  const { data: connectors } = useConnectors();

  const agent = getSelectedAgent();
  const [form, setForm] = useState<Partial<AgentNodeData>>({});

  useEffect(() => {
    if (agent) setForm(agent);
  }, [selectedAgentId]);

  if (!selectedAgentId || !agent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm px-4 text-center">
        Click an agent node to configure it
      </div>
    );
  }

  function save() {
    if (!selectedAgentId) return;
    updateAgentData(selectedAgentId, form as Partial<AgentNodeData>);
  }

  function addTool(connectorId: string) {
    const connector = connectors?.find((c) => c.slug === connectorId);
    if (!connector) return;
    const newTool: AgentTool = {
      id: `tool-${Date.now()}`,
      connector_id: connectorId,
      label: connector.name,
      config: {},
    };
    setForm((f) => ({ ...f, tools: [...(f.tools ?? []), newTool] }));
  }

  function removeTool(toolId: string) {
    setForm((f) => ({ ...f, tools: (f.tools ?? []).filter((t) => t.id !== toolId) }));
  }

  return (
    <div className="w-80 h-full bg-node-bg border-l border-node-border flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-node-border">
        <h3 className="text-sm font-semibold text-white">Agent Config</h3>
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-xs text-white font-medium transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
          <input
            value={form.name ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full bg-black/30 border border-node-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Role</label>
          <input
            value={form.role ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full bg-black/30 border border-node-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Model</label>
          <select
            value={form.model ?? 'claude-opus-4-5'}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            className="w-full bg-black/30 border border-node-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">System Prompt</label>
          <textarea
            value={form.system_prompt ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
            rows={6}
            className="w-full bg-black/30 border border-node-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Tools */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-400">Tools</label>
          </div>

          {(form.tools ?? []).map((tool) => (
            <div key={tool.id} className="flex items-center gap-2 mb-1.5">
              <span className="flex-1 text-xs bg-node-border/60 px-2 py-1.5 rounded-lg text-gray-300 truncate">
                {tool.label}
              </span>
              <button
                onClick={() => removeTool(tool.id)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {connectors && connectors.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && addTool(e.target.value)}
              className="w-full mt-1 bg-black/30 border border-dashed border-node-border rounded-lg px-3 py-2 text-xs text-gray-500 focus:outline-none"
            >
              <option value="">+ Add tool...</option>
              {connectors
                .filter((c) => !(form.tools ?? []).some((t) => t.connector_id === c.slug))
                .map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
