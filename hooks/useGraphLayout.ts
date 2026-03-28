import { useCallback } from 'react';
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  start: { width: 160, height: 48 },
  end: { width: 160, height: 48 },
  action: { width: 240, height: 80 },
  decision: { width: 200, height: 100 },
  handoff: { width: 240, height: 96 },
  wait: { width: 200, height: 72 },
  error: { width: 200, height: 72 },
  skill: { width: 220, height: 88 },
  agent: { width: 240, height: 80 },
};

const DEFAULT_DIM = { width: 220, height: 80 };

export function useGraphLayout() {
  const layoutNodes = useCallback(
    (nodes: Node[], edges: Edge[], direction: 'LR' | 'TB' = 'LR'): { nodes: Node[]; edges: Edge[] } => {
      const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
      g.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 100,
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
