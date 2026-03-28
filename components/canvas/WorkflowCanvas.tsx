'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
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
import { cn } from '@/lib/cn';

function FitViewOnChange() {
  const { fitView } = useReactFlow();
  const nodes = useWorkflowStore((s) => s.nodes);
  const prevCount = useRef(-1);

  useEffect(() => {
    if (nodes.length !== prevCount.current) {
      prevCount.current = nodes.length;
      if (nodes.length === 0) return;
      const t = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [nodes.length, fitView]);

  return null;
}

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
  const agentStatuses = useExecutionStore((s) => s.agentStatuses);
  const isRunning = useExecutionStore((s) => s.isRunning);

  const edges: Edge[] = useMemo(() => {
    if (!isRunning) return storeEdges;
    return storeEdges.map((e) => {
      const targetStatus = agentStatuses[e.target];
      const sourceStatus = agentStatuses[e.source];
      const shouldAnimate =
        targetStatus === 'running' ||
        (sourceStatus === 'completed' && targetStatus === 'running');
      const isCompleted = sourceStatus === 'completed' && targetStatus === 'completed';
      const baseStyle = (e.style ?? {}) as Record<string, unknown>;
      return {
        ...e,
        animated: shouldAnimate,
        style: {
          ...baseStyle,
          stroke: shouldAnimate ? '#3b82f6' : isCompleted ? '#10b981' : (baseStyle.stroke as string) ?? '#7c3aed',
          strokeWidth: shouldAnimate ? 2 : (baseStyle.strokeWidth as number) ?? 1.5,
        },
      };
    });
  }, [storeEdges, agentStatuses, isRunning]);

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
        fitViewOptions={{ padding: 0.2 }}
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
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
                sopViewerOpen
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900',
              )}
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
        <FitViewOnChange />
      </ReactFlow>
    </div>
  );
}
