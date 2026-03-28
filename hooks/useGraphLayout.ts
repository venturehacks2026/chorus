import { useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  start: { width: 180, height: 52 },
  end: { width: 180, height: 52 },
  action: { width: 280, height: 80 },
  decision: { width: 260, height: 100 },
  handoff: { width: 280, height: 96 },
  wait: { width: 260, height: 80 },
  error: { width: 260, height: 80 },
  skill: { width: 260, height: 88 },
  agent: { width: 280, height: 80 },
};

const DEFAULT_DIM = { width: 260, height: 80 };

export function useGraphLayout() {
  const layoutNodes = useCallback(
    (nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR'): { nodes: Node[]; edges: Edge[] } => {
      const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
      const isTB = direction === 'TB';
      g.setGraph({
        rankdir: direction,
        nodesep: isTB ? 50 : 60,
        ranksep: isTB ? 70 : 100,
        edgesep: 20,
        marginx: 40,
        marginy: 40,
      });

      for (const node of nodes) {
        const dim = NODE_DIMENSIONS[node.type ?? 'agent'] ?? DEFAULT_DIM;
        g.setNode(node.id, { width: dim.width, height: dim.height });
      }

      for (const edge of edges) {
        g.setEdge(edge.source, edge.target);
      }

      dagre.layout(g);

      const layoutedNodes = nodes.map((node) => {
        const pos = g.node(node.id);
        const dim = NODE_DIMENSIONS[node.type ?? 'agent'] ?? DEFAULT_DIM;
        return {
          ...node,
          position: {
            x: pos.x - dim.width / 2,
            y: pos.y - dim.height / 2,
          },
        };
      });

      return { nodes: layoutedNodes, edges };
    },
    [],
  );

  return { layoutNodes };
}
