'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Save, ArrowLeft, Shield, Settings, Loader2,
  CheckCircle, XCircle
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { supabase } from '@/lib/supabase-browser';
import type { AgentExecution, Execution } from '@/lib/types';
import { cn } from '@/lib/cn';
import AgentConfigPanel from './workflow/AgentConfigPanel';
import ContractEditor from './workflow/ContractEditor';
import ExecutionPanel from './execution/ExecutionPanel';

// Dynamically import ReactFlow to avoid SSR issues
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

  // Realtime subscription for execution
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

  // Auto-switch to execution panel on run
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
    const data = await res.json() as { execution_id: string };
    startExecution(data.execution_id);
    setRunning(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-text-subtle animate-spin" />
      </div>
    );
  }

  const isExecRunning = executionStatus === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-bg-subtle shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border text-text-subtle hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-medium text-text truncate max-w-[200px]">
          {data?.workflow?.name}
        </span>

        {executionStatus === 'completed' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />Completed
          </span>
        )}
        {executionStatus === 'failed' && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="w-3.5 h-3.5" />Failed
          </span>
        )}

        <div className="flex-1" />

        {/* Panel toggle */}
        <div className="flex bg-bg border border-border rounded-lg p-0.5">
          {([['config', Settings, 'Config'], ['contracts', Shield, 'Contracts'], ['execution', Play, 'Live']] as const).map(([p, Icon, label]) => {
            if (p === 'execution' && !executionId) return null;
            return (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  panel === p ? 'bg-border text-text' : 'text-text-subtle hover:text-text-muted',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isExecRunning}
          className="flex items-center gap-1.5 px-3 py-2 bg-bg border border-border hover:bg-border rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        <button
          onClick={handleRun}
          disabled={isExecRunning || running}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all',
            isExecRunning || running
              ? 'bg-accent/20 text-accent cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-white',
          )}
        >
          {isExecRunning || running
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</>
            : <><Play className="w-3.5 h-3.5" />Run</>}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-bg">
          <WorkflowCanvas readonly={isExecRunning} />
        </div>

        {panel === 'config' && <AgentConfigPanel />}
        {panel === 'contracts' && id && <ContractEditor workflowId={id} />}
        {panel === 'execution' && <ExecutionPanel />}
      </div>
    </div>
  );
}
