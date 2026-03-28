import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

/**
 * Estimated dimensions per node type.
 * Dagre needs width/height to compute non-overlapping positions.
 * Height estimates are generous to cover expanded states (tool badges, stats cards).
 */
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  agent:          { width: 260, height: 170 },
  'kb-input':     { width: 380, height: 200 },
  'result-output':{ width: 380, height: 200 },
  'agent-output': { width: 320, height: 160 },
  start:          { width: 120, height: 60 },
  end:            { width: 120, height: 60 },
  action:         { width: 200, height: 80 },
  decision:       { width: 200, height: 100 },
  handoff:        { width: 200, height: 80 },
  wait:           { width: 160, height: 60 },
  error:          { width: 160, height: 60 },
  skill:          { width: 200, height: 100 },
  'pdf-viewer':   { width: 300, height: 200 },
};

const DEFAULT_DIMENSIONS = { width: 240, height: 100 };

/**
 * Compute left-to-right dagre layout for React Flow nodes and edges.
 * Returns new node array with updated positions (edges unchanged).
 *
 * Dagre returns center-point coordinates; React Flow uses top-left,
 * so we subtract half-width / half-height.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options?: {
    rankdir?: 'LR' | 'TB';
    nodesep?: number;
    ranksep?: number;
  },
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: options?.rankdir ?? 'LR',
    nodesep: options?.nodesep ?? 60,
    ranksep: options?.ranksep ?? 140,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const registeredNodeIds = new Set(nodes.map(n => n.id));

  for (const node of nodes) {
    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? DEFAULT_DIMENSIONS;
    g.setNode(node.id, { width: dims.width, height: dims.height });
  }

  for (const edge of edges) {
    // Only add edges whose both endpoints exist — dagre auto-creates
    // phantom nodes for unknown IDs, which produces NaN positions.
    if (!registeredNodeIds.has(edge.source) || !registeredNodeIds.has(edge.target)) {
      continue;
    }
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node; // preserve existing position on failure
    const dims = NODE_DIMENSIONS[node.type ?? ''] ?? DEFAULT_DIMENSIONS;
    return {
      ...node,
      position: {
        x: dagreNode.x - dims.width / 2,
        y: dagreNode.y - dims.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
