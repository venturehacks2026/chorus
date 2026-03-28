'use client';

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  BackgroundVariant,
  type Connection,
  type Edge,
  addEdge,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import EdgeMarkerDefs from './edges/EdgeMarkerDefs';
import OverlayToggle from './toolbar/OverlayToggle';
import CoverageBar from './toolbar/CoverageBar';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useExecutionStore } from '@/stores/executionStore';
import { useUIStore } from '@/stores/uiStore';
import { FileText } from 'lucide-react';

function FitViewOnStream() {
  const { fitView } = useReactFlow();
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const prevCount = useRef(nodeCount);

  useEffect(() => {
    if (nodeCount !== prevCount.current && nodeCount > 0) {
      prevCount.current = nodeCount;
      fitView({ padding: 0.25, duration: 600 });
    }
  }, [nodeCount, fitView]);

  return null;
}

export default function WorkflowCanvas({ readonly = false }: { readonly?: boolean }) {
  const sopViewerOpen = useUIStore((s) => s.sopViewerOpen);
  const setSopViewerOpen = useUIStore((s) => s.setSopViewerOpen);
  const nodes = useWorkflowStore((s) => s.nodes);
  const storeEdges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const setEdges = useWorkflowStore((s) => s.setEdges);
  const retryEdges = useExecutionStore((s) => s.retryEdges);

  const edges: Edge[] = useMemo(() => {
    const retryArr: Edge[] = Object.values(retryEdges).map((r) => ({
      id: r.id,
      source: r.shieldId,
      target: r.targetAgentId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6 3' },
      label: 'retry',
      labelStyle: { fill: '#ef4444', fontSize: 10, fontWeight: 600 },
    }));
    return [...storeEdges, ...retryArr];
  }, [storeEdges, retryEdges]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#7c3aed', strokeWidth: 1.5 } }, storeEdges)),
    [storeEdges, setEdges],
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
        <FitViewOnStream />
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
