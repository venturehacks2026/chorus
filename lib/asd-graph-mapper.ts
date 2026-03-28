import type { Node, Edge } from '@xyflow/react';
import type { ASDNode, ASDEdge } from '@/lib/knowledge-types';
import type {
  ASDNodeType,
  BaseNodeData,
  ActionNodeData,
  DecisionNodeData,
  HandoffNodeData,
  WaitNodeData,
} from '@/lib/types';

/**
 * Maps knowledge-domain NodeType to ReactFlow custom node type string.
 */
const NODE_TYPE_MAP: Record<string, ASDNodeType> = {
  action: 'action',
  decision: 'decision',
  human_handoff: 'handoff',
  wait: 'wait',
  start: 'start',
  end: 'end',
  error: 'error',
};

/**
 * Maps knowledge-domain EdgeType to ReactFlow custom edge type string.
 */
const EDGE_TYPE_MAP: Record<string, string> = {
  sequential: 'flow',
  true_branch: 'decision-true',
  false_branch: 'decision-false',
  error_handler: 'error',
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function buildBaseData(node: ASDNode, nodeType: ASDNodeType): BaseNodeData {
  return {
    label: node.node_id,
    description: truncate(node.description ?? '', 50),
    nodeType,
    confidenceScore: node.confidence_score ?? 1,
    status: node.needs_clarification ? 'needs_clarification' : 'complete',
    contracts: [],
    layoutDirection: 'TB',
  };
}

function buildDecisionData(
  node: ASDNode,
  edges: ASDEdge[],
): DecisionNodeData {
  const trueEdge = edges.find(
    (e) => e.from_node_id === node.node_id && e.edge_type === 'true_branch',
  );
  const falseEdge = edges.find(
    (e) => e.from_node_id === node.node_id && e.edge_type === 'false_branch',
  );

  return {
    ...buildBaseData(node, 'decision'),
    nodeType: 'decision',
    condition: truncate(node.description ?? '', 50),
    conditionExpression: '',
    trueBranchLabel: trueEdge?.condition_label ?? 'Yes',
    falseBranchLabel: falseEdge?.condition_label ?? 'No',
  };
}

function buildHandoffData(node: ASDNode): HandoffNodeData {
  const config = (node.config ?? {}) as Record<string, unknown>;
  return {
    ...buildBaseData(node, 'handoff'),
    nodeType: 'handoff',
    escalationTarget: (config.escalation_target as string) ?? 'Human Agent',
    escalationChannel: (config.escalation_channel as string) ?? '',
    slaMinutes: (config.sla_minutes as number) ?? 0,
  };
}

function buildWaitData(node: ASDNode): WaitNodeData {
  const config = (node.config ?? {}) as Record<string, unknown>;
  return {
    ...buildBaseData(node, 'wait'),
    nodeType: 'wait',
    waitType: (config.wait_type as WaitNodeData['waitType']) ?? 'external_trigger',
    durationMinutes: (config.duration_minutes as number) ?? undefined,
    triggerDescription: (config.trigger_description as string) ?? undefined,
  };
}

function buildActionData(node: ASDNode): ActionNodeData {
  return {
    ...buildBaseData(node, 'action'),
    nodeType: 'action',
  };
}

/**
 * Convert knowledge-domain ASDNode[] and ASDEdge[] into ReactFlow Node[] and Edge[].
 * Positions are not set here — run through useGraphLayout() after calling this.
 */
export function mapASDToFlowGraph(
  asdNodes: ASDNode[],
  asdEdges: ASDEdge[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = asdNodes
    .sort((a, b) => a.position_index - b.position_index)
    .map((node) => {
      const rfType = NODE_TYPE_MAP[node.type] ?? 'action';

      let data: BaseNodeData;
      switch (rfType) {
        case 'decision':
          data = buildDecisionData(node, asdEdges);
          break;
        case 'handoff':
          data = buildHandoffData(node);
          break;
        case 'wait':
          data = buildWaitData(node);
          break;
        case 'action':
          data = buildActionData(node);
          break;
        default:
          data = buildBaseData(node, rfType);
      }

      return {
        id: node.node_id,
        type: rfType,
        position: { x: 0, y: 0 }, // filled by dagre layout
        data: data as unknown as Record<string, unknown>,
      };
    });

  const edges: Edge[] = asdEdges.map((edge) => ({
    id: edge.id,
    source: edge.from_node_id,
    target: edge.to_node_id,
    type: EDGE_TYPE_MAP[edge.edge_type] ?? 'flow',
    data: {
      edgeType: EDGE_TYPE_MAP[edge.edge_type] ?? 'default',
      label: edge.condition_label ?? undefined,
    },
  }));

  return { nodes, edges };
}
