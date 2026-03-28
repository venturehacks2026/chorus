import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GitBranch, Clock, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow } from '@/hooks/useWorkflows';
import { useWorkflowStore } from '@/stores/workflowStore';
import NLInputModal from '@/components/workflow/NLInputModal';
import type { Workflow, WorkflowStatus } from 'chorus-shared';
import { cn } from '@/lib/cn';

const STATUS_ICON: Record<WorkflowStatus, React.ReactNode> = {
  draft: <Clock className="w-4 h-4 text-gray-400" />,
  running: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
};

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: workflows = [], isLoading } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const [showModal, setShowModal] = useState(false);

  async function handleCreate(name: string, nl_prompt: string) {
    const { workflow } = await createWorkflow.mutateAsync({ name, nl_prompt });
    loadGraph(workflow.id, workflow.graph_json);
    navigate(`/workflows/${workflow.id}`);
  }

  function openWorkflow(workflow: Workflow) {
    loadGraph(workflow.id, workflow.graph_json);
    navigate(`/workflows/${workflow.id}`);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-node-border">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Orchestrate AI agents with natural language
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-xl text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}

        {!isLoading && workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <GitBranch className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-lg font-medium text-gray-400">No workflows yet</p>
            <p className="text-sm text-gray-600 mt-1 mb-6">
              Create one by describing your task in natural language
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover rounded-xl text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first workflow
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf: Workflow) => (
            <div
              key={wf.id}
              className="group relative bg-node-bg border border-node-border rounded-2xl p-5 hover:border-accent/50 transition-all cursor-pointer"
              onClick={() => openWorkflow(wf)}
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this workflow?')) deleteWorkflow.mutate(wf.id);
                }}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <GitBranch className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{wf.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {wf.nl_prompt ?? 'No description'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5">
                  {STATUS_ICON[wf.status]}
                  <span className={cn(
                    'text-xs font-medium',
                    wf.status === 'running' ? 'text-blue-400' :
                    wf.status === 'completed' ? 'text-emerald-400' :
                    wf.status === 'failed' ? 'text-red-400' : 'text-gray-400',
                  )}>
                    {STATUS_LABEL[wf.status]}
                  </span>
                </div>
                <span className="text-xs text-gray-600">
                  {wf.graph_json?.agents?.length ?? 0} agents
                </span>
              </div>

              <div className="text-xs text-gray-700 mt-2">
                {new Date(wf.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <NLInputModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
