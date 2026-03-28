import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Save, ArrowLeft, Shield, Settings, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useWorkflow } from '@/hooks/useWorkflows';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { useRealtimeExecution } from '@/hooks/useRealtimeExecution';
import { useRunExecution } from '@/hooks/useExecution';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas';
import AgentConfigPanel from '@/components/workflow/AgentConfigPanel';
import ContractEditor from '@/components/workflow/ContractEditor';
import ExecutionPanel from '@/components/execution/ExecutionPanel';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

type SidePanel = 'config' | 'contracts' | 'execution';

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useWorkflow(id);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const toWorkflowGraph = useWorkflowStore((s) => s.toWorkflowGraph);
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const executionId = useExecutionStore((s) => s.executionId);
  const executionStatus = useExecutionStore((s) => s.executionStatus);
  const startExecution = useExecutionStore((s) => s.startExecution);
  const runExecution = useRunExecution();
  const [sidePanel, setSidePanel] = useState<SidePanel>('config');
  const [saving, setSaving] = useState(false);

  // Load graph when data arrives (only if not already loaded for this workflow)
  useEffect(() => {
    if (data && data.workflow.id !== workflowId) {
      loadGraph(data.workflow.id, data.workflow.graph_json);
    }
  }, [data?.workflow.id]);

  // Realtime subscription
  useRealtimeExecution(executionId);

  // Auto-switch to execution panel when running
  useEffect(() => {
    if (executionStatus === 'running') {
      setSidePanel('execution');
    }
  }, [executionStatus]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await api.workflows.update(id, toWorkflowGraph());
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!id) return;
    // Save first
    await handleSave();
    const { execution_id } = await runExecution.mutateAsync(id);
    startExecution(execution_id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const isRunning = executionStatus === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-node-border bg-node-bg">
        <button
          onClick={() => navigate('/workflows')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-node-border text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h2 className="text-sm font-semibold text-white truncate max-w-xs">
          {data?.workflow.name}
        </h2>

        {executionStatus === 'completed' && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
        )}
        {executionStatus === 'failed' && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Side panel toggles */}
        <div className="flex gap-1 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setSidePanel('config')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              sidePanel === 'config' ? 'bg-node-border text-white' : 'text-gray-500 hover:text-gray-300',
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            Config
          </button>
          <button
            onClick={() => setSidePanel('contracts')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
              sidePanel === 'contracts' ? 'bg-node-border text-white' : 'text-gray-500 hover:text-gray-300',
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Contracts
          </button>
          {executionId && (
            <button
              onClick={() => setSidePanel('execution')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                sidePanel === 'execution' ? 'bg-node-border text-white' : 'text-gray-500 hover:text-gray-300',
              )}
            >
              <Play className="w-3.5 h-3.5" />
              Live
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isRunning}
          className="flex items-center gap-1.5 px-3 py-2 bg-node-border hover:bg-gray-700 disabled:opacity-50 rounded-lg text-xs text-white font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        <button
          onClick={handleRun}
          disabled={isRunning || runExecution.isPending}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all',
            isRunning
              ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-white',
          )}
        >
          {isRunning || runExecution.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Workflow
            </>
          )}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkflowCanvas readonly={isRunning} />
        </div>

        {/* Side panels */}
        {sidePanel === 'config' && <AgentConfigPanel />}
        {sidePanel === 'contracts' && id && <ContractEditor workflowId={id} />}
        {sidePanel === 'execution' && <ExecutionPanel />}
      </div>
    </div>
  );
}
