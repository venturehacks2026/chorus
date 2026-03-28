'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { supabase } from '@/lib/supabase-browser';
import type { AgentExecution, Execution } from '@/lib/types';
import { cn } from '@/lib/cn';
import AgentConfigPanel from './workflow/AgentConfigPanel';
import ContractEditor from './workflow/ContractEditor';
import ExecutionPanel from './execution/ExecutionPanel';

const WorkflowCanvas = dynamic(() => import('./canvas/WorkflowCanvas'), { ssr: false });

type Panel = 'config' | 'contracts' | 'execution';

export default function WorkflowEditor() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const toWorkflowGraph = useWorkflowStore((s) => s.toWorkflowGraph);
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const executionId = useExecutionStore((s) => s.executionId);
  const executionStatus = useExecutionStore((s) => s.executionStatus);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const updateAgentStatus = useExecutionStore((s) => s.updateAgentStatus);
  const updateExecutionStatus = useExecutionStore((s) => s.updateExecutionStatus);
  const [panel, setPanel] = useState<Panel>('config');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', id],
    queryFn: () => fetch(`/api/workflows/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.workflow && data.workflow.id !== workflowId) {
      loadGraph(data.workflow.id, data.workflow.graph_json);
    }
  }, [data?.workflow?.id]);

  useEffect(() => {
    if (!executionId) return;
    const ch = supabase.channel(`exec:${executionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_executions', filter: `execution_id=eq.${executionId}` },
        (p) => {
          const row = p.new as AgentExecution;
          updateAgentStatus(row.agent_id, row.status, row.id);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executions', filter: `id=eq.${executionId}` },
        (p) => { updateExecutionStatus((p.new as Execution).status); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [executionId]);

  useEffect(() => {
    if (executionStatus === 'running') setPanel('execution');
  }, [executionStatus]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    await fetch(`/api/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph_json: toWorkflowGraph() }),
    });
    setSaving(false);
  }

  async function handleRun() {
    if (!id) return;
    setRunning(true);
    await handleSave();
    const res = await fetch('/api/executions/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: id }),
    });
    const json = await res.json() as { execution_id: string };
    startExecution(json.execution_id);
    setRunning(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-4 h-4 border-2 border-border border-t-text-subtle rounded-full animate-spin" />
      </div>
    );
  }

  const isExecRunning = executionStatus === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-bg shrink-0">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          Agents
        </button>
        <span className="text-text-subtle text-sm">/</span>
        <span className="text-sm font-medium text-text truncate max-w-[240px]">
          {data?.workflow?.name}
        </span>

        {executionStatus === 'completed' && (
          <span className="text-xs text-emerald-600 font-medium">Completed</span>
        )}
        {executionStatus === 'failed' && (
          <span className="text-xs text-red-500 font-medium">Failed</span>
        )}

        <div className="flex-1" />

        {/* Panel toggle */}
        <div className="flex bg-bg-muted border border-border rounded-md p-0.5">
          {(['config', 'contracts', ...(executionId ? ['execution'] : [])] as Panel[]).map((p) => {
            const label = { config: 'Config', contracts: 'Contracts', execution: 'Live' }[p];
            return (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  panel === p ? 'bg-bg text-text shadow-sm' : 'text-text-muted hover:text-text',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isExecRunning}
          className="px-3 py-1.5 bg-bg border border-border hover:bg-bg-muted rounded-md text-xs font-medium transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={handleRun}
          disabled={isExecRunning || running}
          className={cn(
            'px-3.5 py-1.5 rounded-md text-xs font-medium transition-all',
            isExecRunning || running
              ? 'bg-bg-muted text-text-muted cursor-not-allowed border border-border'
              : 'bg-accent hover:bg-accent-hover text-white',
          )}
        >
          {isExecRunning || running ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <WorkflowCanvas readonly={isExecRunning} />
        </div>
        {panel === 'config' && <AgentConfigPanel />}
        {panel === 'contracts' && id && <ContractEditor workflowId={id} />}
        {panel === 'execution' && <ExecutionPanel />}
      </div>
    </div>
  );
}
