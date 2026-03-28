import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode } from './AgentNode';
import { useWorkflowStore } from '@/stores/workflowStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { agent: AgentNode as any };

interface WorkflowCanvasProps {
  readonly?: boolean;
}

export default function WorkflowCanvas({ readonly = false }: WorkflowCanvasProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const setEdges = useWorkflowStore((s) => s.setEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#3a3a4a', strokeWidth: 2 },
          },
          edges,
        ),
      );
    },
    [edges, setEdges],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#2a2a3a"
        />
        <Controls className="!bg-node-bg !border-node-border" />
        <MiniMap
          className="!bg-node-bg !border-node-border"
          nodeColor="#2a2a3a"
          maskColor="rgba(15,15,19,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
