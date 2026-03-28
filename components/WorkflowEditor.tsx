'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  const searchParams = useSearchParams();
  const id = params?.id;
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const loadGraphAnimated = useWorkflowStore((s) => s.loadGraphAnimated);
  const isAnimating = useWorkflowStore((s) => s.isAnimating);
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
  const animatedRef = useRef(false);

  const isNewWorkflow = searchParams?.get('new') === '1';

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', id],
    queryFn: () => fetch(`/api/workflows/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.workflow && data.workflow.id !== workflowId) {
      if (isNewWorkflow && !animatedRef.current) {
        animatedRef.current = true;
        loadGraphAnimated(data.workflow.id, data.workflow.graph_json);
      } else {
        loadGraph(data.workflow.id, data.workflow.graph_json);
      }
    }
  }, [data?.workflow?.id]);

  useEffect(() => {
    if (!executionId) return;
    const ch = supabase.channel(`exec:${executionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_executions', filter: `execution_id=eq.${executionId}` },
        (p) => { const row = p.new as AgentExecution; updateAgentStatus(row.agent_id, row.status, row.id); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'executions', filter: `id=eq.${executionId}` },
        (p) => { updateExecutionStatus((p.new as Execution).status); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [executionId]);

  // Polling fallback: Supabase Realtime may not deliver updates if table
  // replication isn't enabled. Poll every 3s while running so the UI always
  // reflects the true backend status.
  useEffect(() => {
    if (executionStatus !== 'running' || !id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`);
        const json = await res.json() as { workflow: { status: string } };
        const s = json?.workflow?.status;
        if (s && s !== 'running') {
          updateExecutionStatus(s as Execution['status']);
        }
      } catch { /* ignore network blips */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [executionStatus, id]);

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
      <div className="flex items-center justify-center h-full bg-white">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      </div>
    );
  }

  const isExecRunning = executionStatus === 'running';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Agents
        </Link>
        <span className="text-gray-300 text-sm">/</span>
        <span className="text-sm font-medium text-gray-900 truncate max-w-[240px]">
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
        <div className="flex bg-gray-100 border border-gray-200 rounded-lg p-0.5">
          {(['config', 'contracts', ...(executionId ? ['execution'] : [])] as Panel[]).map((p) => {
            const label = { config: 'Config', contracts: 'Contracts', execution: 'Live' }[p];
            return (
              <button
                key={p}
                onClick={() => setPanel(p)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  panel === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
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
          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={handleRun}
          disabled={isExecRunning || running}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            isExecRunning || running
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
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
