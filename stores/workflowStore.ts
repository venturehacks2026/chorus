import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { AgentNodeData, WorkflowGraph } from '@/lib/types';

const EDGE_STYLE = { stroke: '#7c3aed', strokeWidth: 1.5 };
const SHIELD_SPACING = 200;

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function injectShieldNodes(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const outNodes: Node[] = [...nodes];
  const outEdges: Edge[] = [];

  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    const bothAgents = src?.type === 'agent' && tgt?.type === 'agent';

    if (!bothAgents) {
      outEdges.push(edge);
      continue;
    }

    const shieldId = `shield-${edge.source}-${edge.target}`;
    const pos = midpoint(src!.position, tgt!.position);

    outNodes.push({
      id: shieldId,
      type: 'contract-shield',
      position: { x: pos.x - 32, y: pos.y - 28 },
      data: { sourceAgentId: edge.source, targetAgentId: edge.target, contractCount: 0 },
    });

    outEdges.push({
      id: `${edge.id}__to-shield`,
      source: edge.source,
      target: shieldId,
      type: 'smoothstep',
      style: EDGE_STYLE,
      animated: edge.animated,
    });
    outEdges.push({
      id: `${edge.id}__from-shield`,
      source: shieldId,
      target: edge.target,
      type: 'smoothstep',
      style: EDGE_STYLE,
      animated: edge.animated,
    });
  }

  return { nodes: outNodes, edges: outEdges };
}

interface WorkflowStore {
  nodes: Node[];
  edges: Edge[];
  selectedAgentId: string | null;
  workflowId: string | null;

  loadGraph: (workflowId: string, graph: WorkflowGraph) => void;
  addStreamedAgent: (agent: AgentNodeData) => void;
  initStreamingInput: (nlPrompt: string) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectAgent: (id: string | null) => void;
  updateAgentData: (id: string, patch: Partial<AgentNodeData>) => void;
  getSelectedAgent: () => AgentNodeData | null;
  toWorkflowGraph: () => WorkflowGraph;
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
  (set, get) => ({
  nodes: [],
  edges: [],
  selectedAgentId: null,
  workflowId: null,

  addStreamedAgent: (agent) => {
    set((state) => {
      if (state.nodes.find(n => n.id === agent.id)) return state;

      const agentIdx = state.nodes.filter(n => n.type === 'agent').length;
      const agentNode: Node = {
        id: agent.id,
        type: 'agent',
        position: agent.position ?? { x: 150 + agentIdx * (SHIELD_SPACING + 220), y: 200 },
        data: agent as Record<string, unknown>,
      };

      const newNodes = [...state.nodes, agentNode];
      const newEdges = [...state.edges];

      const agentNodes = state.nodes.filter(n => n.type === 'agent');
      const sourceId = agentNodes.length > 0
        ? agentNodes[agentNodes.length - 1].id
        : state.nodes.find(n => n.id === 'kb-input')?.id;

      if (sourceId) {
        const sourceNode = state.nodes.find(n => n.id === sourceId);
        const isSourceAgent = sourceNode?.type === 'agent';

        if (isSourceAgent) {
          const shieldId = `shield-${sourceId}-${agent.id}`;
          const shieldX = (sourceNode!.position.x + agentNode.position.x) / 2 - 32;
          const shieldY = (sourceNode!.position.y + agentNode.position.y) / 2 - 28;

          newNodes.push({
            id: shieldId,
            type: 'contract-shield',
            position: { x: shieldX, y: shieldY },
            data: { sourceAgentId: sourceId, targetAgentId: agent.id, contractCount: 0 },
          });

          newEdges.push(
            { id: `stream-${sourceId}-${shieldId}`, source: sourceId, target: shieldId, type: 'smoothstep', style: EDGE_STYLE, animated: true },
            { id: `stream-${shieldId}-${agent.id}`, source: shieldId, target: agent.id, type: 'smoothstep', style: EDGE_STYLE, animated: true },
          );
        } else {
          newEdges.push({
            id: `stream-edge-${sourceId}-${agent.id}`,
            source: sourceId,
            target: agent.id,
            type: 'smoothstep',
            style: EDGE_STYLE,
            animated: true,
          });
        }
      }

      return { nodes: newNodes, edges: newEdges };
    });
  },

  initStreamingInput: (nlPrompt) => {
    set({
      nodes: [{
        id: 'kb-input',
        type: 'input',
        position: { x: -260, y: 200 },
        data: { label: nlPrompt.slice(0, 80), nlPrompt } as Record<string, unknown>,
      }],
      edges: [],
    });
  },

  loadGraph: (workflowId, graph) => {
    const rawNodes: Node[] = graph.agents.map((agent) => ({
      id: agent.id,
      type: 'agent',
      position: agent.position ?? { x: 0, y: 0 },
      data: agent as Record<string, unknown>,
    }));

    const rawEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source_agent_id,
      target: e.target_agent_id,
      label: e.label,
      type: 'smoothstep',
      style: EDGE_STYLE,
    }));

    const { nodes, edges } = injectShieldNodes(rawNodes, rawEdges);
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
    const agentNodes = nodes.filter(n => n.type === 'agent');
    const shieldNodes = nodes.filter(n => n.type === 'contract-shield');

    const resolvedEdges: { id: string; source: string; target: string; label?: string }[] = [];

    for (const shield of shieldNodes) {
      const data = shield.data as { sourceAgentId: string; targetAgentId: string };
      resolvedEdges.push({
        id: `edge-${data.sourceAgentId}-${data.targetAgentId}`,
        source: data.sourceAgentId,
        target: data.targetAgentId,
      });
    }

    const shieldIds = new Set(shieldNodes.map(n => n.id));
    for (const e of edges) {
      if (shieldIds.has(e.source) || shieldIds.has(e.target)) continue;
      if (resolvedEdges.some(r => r.source === e.source && r.target === e.target)) continue;
      resolvedEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
      });
    }

    return {
      agents: agentNodes.map((n) => ({ ...(n.data as unknown as AgentNodeData), position: n.position })),
      edges: resolvedEdges.map(e => ({
        id: e.id,
        source_agent_id: e.source,
        target_agent_id: e.target,
        label: e.label,
      })),
    };
  },
  }),
  {
    name: 'chorus-workflow',
    partialize: (s) => ({ workflowId: s.workflowId }),
  }
));
