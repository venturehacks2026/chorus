'use client';

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
const nodeTypes: Record<string, any> = { agent: AgentNode };

export default function WorkflowCanvas({ readonly = false }: { readonly?: boolean }) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const setEdges = useWorkflowStore((s) => s.setEdges);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#27272A', strokeWidth: 1.5 } }, edges)),
    [edges, setEdges],
  );

  return (
    <div className="w-full h-full bg-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        proOptions={{ hideAttribution: true }}
        className="bg-bg"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272A" />
        <Controls />
        <MiniMap nodeColor="#27272A" maskColor="rgba(9,9,11,0.8)" />
      </ReactFlow>
    </div>
  );
}
