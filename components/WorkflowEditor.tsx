'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { supabase } from '@/lib/supabase-browser';
import type { AgentExecution, Execution, AgentNodeData } from '@/lib/types';
import { cn } from '@/lib/cn';
import AgentConfigPanel from './workflow/AgentConfigPanel';
import ContractEditor from './workflow/ContractEditor';
import ExecutionPanel from './execution/ExecutionPanel';

const WorkflowCanvas = dynamic(() => import('./canvas/WorkflowCanvas'), { ssr: false });

type Panel = 'config' | 'contracts' | 'execution';

export default function WorkflowEditor() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const addStreamedAgent = useWorkflowStore((s) => s.addStreamedAgent);
  const setEdges = useWorkflowStore((s) => s.setEdges);
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
  const [isStreaming, setIsStreaming] = useState(false);
  const streamDoneRef = useRef(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflows', id],
    queryFn: () => fetch(`/api/workflows/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  // If the workflow was just created (graph is empty), poll for streaming completion
  useEffect(() => {
    if (!data?.workflow) return;
    const graph = data.workflow.graph_json;
    const isEmpty = !graph?.agents?.length;

    if (isEmpty && !streamDoneRef.current) {
      setIsStreaming(true);
      // Poll until graph has agents
      const interval = setInterval(async () => {
        const r = await fetch(`/api/workflows/${id}`);
        const d = await r.json();
        if (d.workflow?.graph_json?.agents?.length > 0) {
          clearInterval(interval);
          streamDoneRef.current = true;
          setIsStreaming(false);
          loadGraph(d.workflow.id, d.workflow.graph_json);
          // Remove streaming animation from edges once done
          setEdges(
            useWorkflowStore.getState().edges.map(e => ({ ...e, animated: false }))
          );
          refetch();
        }
      }, 800);
      return () => clearInterval(interval);
    } else if (!isEmpty && data.workflow.id !== workflowId) {
      loadGraph(data.workflow.id, data.workflow.graph_json);
    }
  }, [data?.workflow?.id, data?.workflow?.graph_json?.agents?.length]);

  // On mount: if we have a persisted executionId for this workflow, rehydrate state from DB
  useEffect(() => {
    if (!id) return;
    const execWfId = useExecutionStore.getState().executionWorkflowId;
    const persistedExecId = useExecutionStore.getState().executionId;
    // Only rehydrate if this execution belongs to the current workflow and is not already done
    if (!persistedExecId || execWfId !== id) return;
    const persistedStatus = useExecutionStore.getState().executionStatus;
    if (persistedStatus === 'completed' || persistedStatus === 'failed') return;

    // Fetch live state from DB
    fetch(`/api/executions/${persistedExecId}`)
      .then(r => r.json())
      .then(({ execution, agent_executions }) => {
        if (!execution) return;
        updateExecutionStatus(execution.status);
        (agent_executions ?? []).forEach((ae: AgentExecution) => {
          updateAgentStatus(ae.agent_id, ae.status, ae.id);
        });
      })
      .catch(() => {/* silently skip if network fails */});
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Realtime subscriptions for execution
  useEffect(() => {
    if (!executionId) return;
    const ch = supabase.channel(`exec:${executionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agent_executions',
        filter: `execution_id=eq.${executionId}`,
      }, (p) => {
        const row = p.new as AgentExecution;
        updateAgentStatus(row.agent_id, row.status, row.id);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'executions',
        filter: `id=eq.${executionId}`,
      }, (p) => {
        updateExecutionStatus((p.new as Execution).status);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [executionId]);

  useEffect(() => {
    if (executionStatus === 'running') setPanel('execution');
    if (executionStatus === 'completed' || executionStatus === 'failed') {
      setPanel('execution');
    }
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
    startExecution(json.execution_id, id);
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

        {isStreaming && (
          <span className="flex items-center gap-1.5 text-xs text-violet-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Building graph…
          </span>
        )}
        {executionStatus === 'completed' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Completed
          </span>
        )}
        {executionStatus === 'failed' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failed
          </span>
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
          disabled={saving || isExecRunning || isStreaming}
          className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          onClick={handleRun}
          disabled={isExecRunning || running || isStreaming}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            isExecRunning || running || isStreaming
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
          {isStreaming && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-end justify-center pb-8 pointer-events-none">
              <div className="bg-white border border-violet-100 shadow-lg rounded-xl px-5 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Building your workflow…</span>
                <span className="text-xs text-gray-400">agents will appear as they&apos;re designed</span>
              </div>
            </div>
          )}
        </div>
        {panel === 'config' && <AgentConfigPanel />}
        {panel === 'contracts' && id && <ContractEditor workflowId={id} />}
        {panel === 'execution' && <ExecutionPanel workflowAgents={data?.workflow?.graph_json?.agents as AgentNodeData[] ?? []} />}
      </div>
    </div>
  );
}
