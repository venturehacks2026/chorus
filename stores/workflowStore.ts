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
  isAnimating: boolean;

  loadGraph: (workflowId: string, graph: WorkflowGraph) => void;
  loadGraphAnimated: (workflowId: string, graph: WorkflowGraph) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectAgent: (id: string | null) => void;
  updateAgentData: (id: string, patch: Partial<AgentNodeData>) => void;
  getSelectedAgent: () => AgentNodeData | null;
  toWorkflowGraph: () => WorkflowGraph;
}

let animationTimers: ReturnType<typeof setTimeout>[] = [];

function buildNodes(graph: WorkflowGraph): Node[] {
  return graph.agents.map((agent) => ({
    id: agent.id,
    type: 'agent',
    position: agent.position ?? { x: 0, y: 0 },
    data: agent as Record<string, unknown>,
  }));
}

function buildEdges(graph: WorkflowGraph): Edge[] {
  return graph.edges.map((e) => ({
    id: e.id,
    source: e.source_agent_id,
    target: e.target_agent_id,
    label: e.label,
    type: 'smoothstep',
    style: { stroke: '#7c3aed', strokeWidth: 1.5 },
  }));
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedAgentId: null,
  workflowId: null,
  isAnimating: false,

  loadGraph: (workflowId, graph) => {
    animationTimers.forEach(clearTimeout);
    animationTimers = [];
    set({ nodes: buildNodes(graph), edges: buildEdges(graph), workflowId, selectedAgentId: null, isAnimating: false });
  },

  loadGraphAnimated: (workflowId, graph) => {
    animationTimers.forEach(clearTimeout);
    animationTimers = [];

    const allNodes = buildNodes(graph);
    const allEdges = buildEdges(graph);
    const sorted = [...allNodes].sort((a, b) => a.position.x - b.position.x);

    set({ nodes: [], edges: [], workflowId, selectedAgentId: null, isAnimating: true });

    const STAGGER = 500;
    const revealedIds = new Set<string>();

    sorted.forEach((node, i) => {
      const t = setTimeout(() => {
        revealedIds.add(node.id);
        const visibleEdges = allEdges.filter(
          (e) => revealedIds.has(e.source) && revealedIds.has(e.target),
        );
        set({ nodes: sorted.slice(0, i + 1), edges: visibleEdges });

        if (i === sorted.length - 1) {
          const done = setTimeout(() => set({ isAnimating: false }), 300);
          animationTimers.push(done);
        }
      }, STAGGER * (i + 1));
      animationTimers.push(t);
    });
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
