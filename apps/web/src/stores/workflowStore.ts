import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { AgentNodeData, WorkflowGraph } from 'chorus-shared';

// React Flow requires node data to extend Record<string, unknown>
export type AgentFlowNode = Node<AgentNodeData & Record<string, unknown>, 'agent'>;
export type FlowEdge = Edge;

interface WorkflowStore {
  nodes: AgentFlowNode[];
  edges: FlowEdge[];
  selectedAgentId: string | null;
  workflowId: string | null;

  loadGraph: (workflowId: string, graph: WorkflowGraph) => void;
  setNodes: (nodes: AgentFlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  onNodesChange: (changes: NodeChange<AgentFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectAgent: (id: string | null) => void;
  updateAgentData: (id: string, patch: Partial<AgentNodeData>) => void;
  getSelectedAgent: () => AgentNodeData | null;
  toWorkflowGraph: () => WorkflowGraph;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedAgentId: null,
  workflowId: null,

  loadGraph: (workflowId, graph) => {
    const nodes: AgentFlowNode[] = graph.agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: agent.position,
      data: agent as AgentNodeData & Record<string, unknown>,
    }));

    const edges: FlowEdge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source_agent_id,
      target: e.target_agent_id,
      label: e.label,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#3a3a4a', strokeWidth: 2 },
    }));

    set({ nodes, edges, workflowId, selectedAgentId: null });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as AgentFlowNode[],
    })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  selectAgent: (id) => set({ selectedAgentId: id }),

  updateAgentData: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...patch } as AgentNodeData & Record<string, unknown> }
          : n,
      ),
    })),

  getSelectedAgent: () => {
    const { nodes, selectedAgentId } = get();
    const node = nodes.find((n) => n.id === selectedAgentId);
    return node ? (node.data as AgentNodeData) : null;
  },

  toWorkflowGraph: (): WorkflowGraph => {
    const { nodes, edges } = get();
    return {
      agents: nodes.map((n) => ({ ...(n.data as AgentNodeData), position: n.position })),
      edges: edges.map((e) => ({
        id: e.id,
        source_agent_id: e.source,
        target_agent_id: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };
  },
}));
