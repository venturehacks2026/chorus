'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  type Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import EdgeMarkerDefs from './edges/EdgeMarkerDefs';
import OverlayToggle from './toolbar/OverlayToggle';
import CoverageBar from './toolbar/CoverageBar';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUIStore } from '@/stores/uiStore';
import { FileText } from 'lucide-react';

export default function WorkflowCanvas({ readonly = false }: { readonly?: boolean }) {
  const sopViewerOpen = useUIStore((s) => s.sopViewerOpen);
  const setSopViewerOpen = useUIStore((s) => s.setSopViewerOpen);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const setEdges = useWorkflowStore((s) => s.setEdges);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#7c3aed', strokeWidth: 1.5 } }, edges)),
    [edges, setEdges],
  );

  return (
    <div className="w-full h-full bg-gray-50">
      <EdgeMarkerDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap nodeColor="#ede9fe" maskColor="rgba(249,249,251,0.85)" />
        <Panel position="top-right">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSopViewerOpen(!sopViewerOpen)}
              title="Toggle SOP document viewer"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                sopViewerOpen ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              SOP
            </button>
            <OverlayToggle />
          </div>
        </Panel>
        <Panel position="top-center">
          <CoverageBar />
        </Panel>
      </ReactFlow>
    </div>
  );
}
