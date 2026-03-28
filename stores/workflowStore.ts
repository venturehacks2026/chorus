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
const AGENT_SPACING = 500;
const INPUT_X = -300;
const AGENT_START_X = 150;
const ROW_Y = 200;

export interface CanvasJson {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowStore {
  nodes: Node[];
  edges: Edge[];
  selectedAgentId: string | null;
  workflowId: string | null;

  loadGraph: (workflowId: string, graph: WorkflowGraph, nlPrompt?: string) => void;
  loadCanvasJson: (workflowId: string, canvas: CanvasJson) => void;
  addStreamedAgent: (agent: AgentNodeData) => void;
  addOutputNode: () => void;
  updateOutputNode: (status: 'pending' | 'running' | 'completed', preview?: string) => void;
  initStreamingInput: (nlPrompt: string, sopTitle?: string, sopSnippet?: string) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  selectAgent: (id: string | null) => void;
  updateAgentData: (id: string, patch: Partial<AgentNodeData>) => void;
  getSelectedAgent: () => AgentNodeData | null;
  toWorkflowGraph: () => WorkflowGraph;
  getCanvasJson: () => CanvasJson;
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
        position: agent.position ?? { x: AGENT_START_X + agentIdx * AGENT_SPACING, y: ROW_Y },
        data: agent as Record<string, unknown>,
      };

      const newNodes = [...state.nodes, agentNode];
      const newEdges = [...state.edges];

      const agentNodes = state.nodes.filter(n => n.type === 'agent');
      const sourceId = agentNodes.length > 0
        ? agentNodes[agentNodes.length - 1].id
        : state.nodes.find(n => n.id === 'sop-input')?.id;

      if (sourceId) {
        newEdges.push({
          id: `stream-edge-${sourceId}-${agent.id}`,
          source: sourceId,
          target: agent.id,
          type: 'smoothstep',
          style: EDGE_STYLE,
          animated: true,
        });
      }

      return { nodes: newNodes, edges: newEdges };
    });
  },

  addOutputNode: () => {
    set((state) => {
      if (state.nodes.find(n => n.id === 'workflow-output')) return state;

      const agentNodes = state.nodes.filter(n => n.type === 'agent');
      const lastAgent = agentNodes[agentNodes.length - 1];
      const outputX = lastAgent
        ? lastAgent.position.x + AGENT_SPACING
        : AGENT_START_X + AGENT_SPACING;

      const outputNode: Node = {
        id: 'workflow-output',
        type: 'workflow-output',
        position: { x: outputX, y: ROW_Y },
        data: { label: 'Output', status: 'pending' } as Record<string, unknown>,
      };

      const newEdges = [...state.edges];
      if (lastAgent) {
        newEdges.push({
          id: `edge-${lastAgent.id}-output`,
          source: lastAgent.id,
          target: 'workflow-output',
          type: 'smoothstep',
          style: EDGE_STYLE,
          animated: false,
        });
      }

      return { nodes: [...state.nodes, outputNode], edges: newEdges };
    });
  },

  updateOutputNode: (status, preview) => {
    set((state) => ({
      nodes: state.nodes.map(n =>
        n.id === 'workflow-output'
          ? { ...n, data: { ...n.data, status, outputPreview: preview ?? n.data.outputPreview } as Record<string, unknown> }
          : n,
      ),
    }));
  },

  initStreamingInput: (nlPrompt, sopTitle, sopSnippet) => {
    set({
      nodes: [{
        id: 'sop-input',
        type: 'sop-input',
        position: { x: INPUT_X, y: ROW_Y },
        data: { label: nlPrompt.slice(0, 80), nlPrompt, sopTitle, sopSnippet } as Record<string, unknown>,
      }],
      edges: [],
    });
  },

  loadCanvasJson: (workflowId, canvas) => {
    set({
      nodes: canvas.nodes ?? [],
      edges: canvas.edges ?? [],
      workflowId,
      selectedAgentId: null,
    });
  },

  loadGraph: (workflowId, graph, nlPrompt) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Input node
    const prompt = nlPrompt ?? graph.agents[0]?.system_prompt ?? '';
    nodes.push({
      id: 'sop-input',
      type: 'sop-input',
      position: { x: INPUT_X, y: ROW_Y },
      data: { label: prompt.slice(0, 80), nlPrompt: prompt } as Record<string, unknown>,
    });

    // Agent nodes
    for (const agent of graph.agents) {
      nodes.push({
        id: agent.id,
        type: 'agent',
        position: agent.position ?? { x: 0, y: 0 },
        data: agent as Record<string, unknown>,
      });
    }

    // Agent-to-agent edges from graph definition
    for (const e of graph.edges) {
      edges.push({
        id: e.id,
        source: e.source_agent_id,
        target: e.target_agent_id,
        label: e.label,
        type: 'smoothstep',
        style: EDGE_STYLE,
      });
    }

    // Edge from input to first agent (by position or first in array)
    if (graph.agents.length > 0) {
      const sorted = [...graph.agents].sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0));
      edges.push({
        id: 'edge-input-first',
        source: 'sop-input',
        target: sorted[0].id,
        type: 'smoothstep',
        style: EDGE_STYLE,
      });

      // Output node
      const lastAgent = sorted[sorted.length - 1];
      const outputX = (lastAgent.position?.x ?? 0) + AGENT_SPACING;
      nodes.push({
        id: 'workflow-output',
        type: 'workflow-output',
        position: { x: outputX, y: ROW_Y },
        data: { label: 'Output', status: 'pending' } as Record<string, unknown>,
      });

      // Find agents with no outgoing edges (terminal agents)
      const hasOutgoing = new Set(graph.edges.map(e => e.source_agent_id));
      const terminalAgents = graph.agents.filter(a => !hasOutgoing.has(a.id));
      for (const ta of terminalAgents) {
        edges.push({
          id: `edge-${ta.id}-output`,
          source: ta.id,
          target: 'workflow-output',
          type: 'smoothstep',
          style: EDGE_STYLE,
        });
      }
    }

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

    return {
      agents: agentNodes.map((n) => ({ ...(n.data as unknown as AgentNodeData), position: n.position })),
      edges: edges
        .filter(e => agentNodes.some(n => n.id === e.source) && agentNodes.some(n => n.id === e.target))
        .map(e => ({
          id: e.id,
          source_agent_id: e.source,
          target_agent_id: e.target,
          label: typeof e.label === 'string' ? e.label : undefined,
        })),
    };
  },

  getCanvasJson: (): CanvasJson => {
    const { nodes, edges } = get();
    return { nodes, edges };
  },
  }),
  {
    name: 'chorus-workflow',
    partialize: (s) => ({ workflowId: s.workflowId }),
  }
));
