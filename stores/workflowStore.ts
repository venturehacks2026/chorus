import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { AgentNodeData, WorkflowGraph } from '@/lib/types';

interface WorkflowStore {
  nodes: Node[];
  edges: Edge[];
  selectedAgentId: string | null;
  workflowId: string | null;

  loadGraph: (workflowId: string, graph: WorkflowGraph) => void;
  addStreamedAgent: (agent: AgentNodeData) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
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

  addStreamedAgent: (agent) => {
    set((state) => {
      if (state.nodes.find(n => n.id === agent.id)) return state;
      const node: Node = {
        id: agent.id,
        type: 'agent',
        position: agent.position ?? { x: 150 + state.nodes.length * 320, y: 200 },
        data: agent as Record<string, unknown>,
      };
      // Auto-connect to previous agent with smoothstep edge
      const newEdges = [...state.edges];
      if (state.nodes.length > 0) {
        const prevNode = state.nodes[state.nodes.length - 1];
        newEdges.push({
          id: `stream-edge-${prevNode.id}-${agent.id}`,
          source: prevNode.id,
          target: agent.id,
          type: 'smoothstep',
          style: { stroke: '#7c3aed', strokeWidth: 1.5 },
          animated: true,
        });
      }
      return { nodes: [...state.nodes, node], edges: newEdges };
    });
  },

  loadGraph: (workflowId, graph) => {
    const nodes: Node[] = graph.agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: agent.position ?? { x: 0, y: 0 },
      data: agent as Record<string, unknown>,
    }));

    const edges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source_agent_id,
      target: e.target_agent_id,
      label: e.label,
      type: 'smoothstep',
      style: { stroke: '#7c3aed', strokeWidth: 1.5 },
    }));

    set({ nodes, edges, workflowId, selectedAgentId: null });
  },

  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  selectAgent: (id) => set({ selectedAgentId: id }),

  updateAgentData: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as Record<string, unknown> } : n,
      ),
    })),

  getSelectedAgent: () => {
    const { nodes, selectedAgentId } = get();
    const node = nodes.find((n) => n.id === selectedAgentId);
    return node ? (node.data as unknown as AgentNodeData) : null;
  },

  toWorkflowGraph: (): WorkflowGraph => {
    const { nodes, edges } = get();
    return {
      agents: nodes.map((n) => ({ ...(n.data as unknown as AgentNodeData), position: n.position })),
      edges: edges.map((e) => ({
        id: e.id,
        source_agent_id: e.source,
        target_agent_id: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };
  },
}));
