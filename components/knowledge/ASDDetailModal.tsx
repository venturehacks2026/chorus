'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Loader2, History, MousePointerClick, Shield, Minimize2,
} from 'lucide-react';
import type {
  ASDDetail, ASDVersion, ASDVersionListItem, ASDNode,
  Clarification, NodeType, ASDStatus, DerivedContract,
} from '@/lib/knowledge-types';
import { mapASDToFlowGraph } from '@/lib/asd-graph-mapper';
import { useGraphLayout } from '@/hooks/useGraphLayout';
import ReadonlyFlowGraph from './ReadonlyFlowGraph';
import ContractReviewPanel from './ContractReviewPanel';
import ClarificationItem from './ClarificationItem';
import { cn } from '@/lib/cn';

/* ── Style maps ── */

const STATUS_STYLE: Record<ASDStatus, string> = {
  compiling:           'bg-blue-50 text-blue-600',
  active:              'bg-emerald-50 text-emerald-700',
  needs_clarification: 'bg-amber-50 text-amber-600',
  needs_recompile:     'bg-red-50 text-red-600',
  archived:            'bg-gray-100 text-gray-500',
};

const NODE_STYLE: Record<NodeType, string> = {
  action:        'bg-blue-50 text-blue-600',
  decision:      'bg-amber-50 text-amber-600',
  human_handoff: 'bg-rose-50 text-rose-600',
  wait:          'bg-gray-100 text-gray-500',
  start:         'bg-emerald-50 text-emerald-700',
  end:           'bg-emerald-50 text-emerald-700',
  error:         'bg-red-50 text-red-600',
};

type Tab = 'overview' | 'contracts' | 'history';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  contracts: 'Contracts',
  history: 'History',
};

/* ── Main component ── */

interface Props {
  asdId: string;
  onClose: () => void;
}

export default function ASDDetailModal({ asdId, onClose }: Props) {
  const qc = useQueryClient();
  const { layoutNodes } = useGraphLayout();

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedYaml, setExpandedYaml] = useState<{ yaml: string; name: string } | null>(null);

  // ── Data fetching ──

  const { data: asd, isLoading } = useQuery<ASDDetail>({
    queryKey: ['asd-detail', asdId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/asds/${asdId}`);
      return res.json();
    },
    enabled: !!asdId,
  });

  const { data: versions = [] } = useQuery<ASDVersionListItem[]>({
    queryKey: ['asd-versions', asdId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/asds/${asdId}/versions`);
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!asdId,
  });

  const { data: versionDetail, isLoading: versionLoading } = useQuery<ASDVersion>({
    queryKey: ['asd-version-detail', asdId, selectedVersion],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/asds/${asdId}/versions/${selectedVersion}`);
      return res.json();
    },
    enabled: !!asdId && selectedVersion !== null,
  });

  const { data: clarifications = [] } = useQuery<Clarification[]>({
    queryKey: ['clarifications', asdId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/asds/${asdId}/clarifications`);
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    enabled: !!asdId,
  });

  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      fetch(`/api/knowledge/clarifications/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clarifications', asdId] });
      qc.invalidateQueries({ queryKey: ['asd-detail', asdId] });
      qc.invalidateQueries({ queryKey: ['asds'] });
    },
  });

  // ── Derived data ──

  const isViewingOldVersion = selectedVersion !== null && selectedVersion !== asd?.current_version;
  const activeVersion = isViewingOldVersion ? versionDetail : asd?.latest_version;
  const rawNodes = activeVersion?.nodes ?? [];
  const rawEdges = activeVersion?.edges ?? [];

  const coverage = asd?.automation_coverage_score ?? 0;
  const pct = Math.round(coverage * 100);

  // ── Graph layout (memoized) ──

  const allContracts = asd?.contracts ?? [];

  const graphData = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [], edges: [] };
    const { nodes: rfNodes, edges: rfEdges } = mapASDToFlowGraph(rawNodes, rawEdges, allContracts);
    return layoutNodes(rfNodes, rfEdges, 'TB');
  }, [rawNodes, rawEdges, allContracts, layoutNodes]);

  // ── Selected node detail ──

  const selectedNode: ASDNode | null = selectedNodeId
    ? rawNodes.find(n => n.node_id === selectedNodeId) ?? null
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-[92vw] max-w-7xl h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <p className="font-semibold text-sm truncate">{asd?.skill_id ?? 'Loading...'}</p>
              {asd && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_STYLE[asd.status])}>
                    {asd.status}
                  </span>
                  <span className="text-[11px] text-gray-400">v{asd.current_version}</span>
                </div>
              )}
            </div>
            {/* Coverage bar inline */}
            {asd && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 tabular-nums">{pct}%</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : asd ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Graph */}
            <div className="flex-1 bg-gray-50 relative">
              {rawNodes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  No nodes in this version
                </div>
              ) : versionLoading && isViewingOldVersion ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                </div>
              ) : (
                <ReadonlyFlowGraph
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  onNodeClick={setSelectedNodeId}
                />
              )}

              {/* Old version banner */}
              {isViewingOldVersion && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <span className="text-xs text-amber-700">Viewing v{selectedVersion}</span>
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className="text-[10px] font-medium text-amber-700 hover:text-amber-900 underline"
                  >
                    Back to current
                  </button>
                </div>
              )}
            </div>

            {/* Right: Detail panel */}
            <div className="w-[22rem] border-l border-gray-200 flex flex-col shrink-0">
              {/* Tabs */}
              <div className="px-4 py-3 border-b border-gray-200 shrink-0">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(['overview', 'contracts', 'history'] as Tab[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={cn(
                        'flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors',
                        activeTab === t
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900',
                      )}
                    >
                      {TAB_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {activeTab === 'overview' && (
                  <OverviewTab
                    asd={asd}
                    selectedNode={selectedNode}
                    pct={pct}
                    contracts={allContracts}
                  />
                )}

                {activeTab === 'contracts' && (
                  <ContractReviewPanel
                    asdId={asdId}
                    onExpandYaml={(yaml, name) => setExpandedYaml({ yaml, name })}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryTab
                    asd={asd}
                    versions={versions}
                    selectedVersion={selectedVersion}
                    onSelectVersion={setSelectedVersion}
                    clarifications={clarifications}
                    onResolve={(id, resolution) => resolve.mutate({ id, resolution })}
                    isResolving={resolve.isPending}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-red-500">Failed to load ASD details.</p>
          </div>
        )}

        {/* Full-modal YAML overlay */}
        {expandedYaml && (
          <div className="absolute inset-0 z-20 bg-white flex flex-col rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-gray-900">{expandedYaml.name}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">YAML DSL</span>
              </div>
              <button
                onClick={() => setExpandedYaml(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Close
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-sm font-mono text-gray-700 leading-relaxed bg-gray-50">
              {expandedYaml.yaml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab({
  asd,
  selectedNode,
  pct,
  contracts,
}: {
  asd: ASDDetail;
  selectedNode: ASDNode | null;
  pct: number;
  contracts: DerivedContract[];
}) {
  const nodeContracts = selectedNode
    ? contracts.filter(c => c.scope_node_ids?.includes(selectedNode.node_id))
    : [];
  if (!selectedNode) {
    return (
      <div className="space-y-5">
        {/* Description */}
        {asd.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{asd.description}</p>
        )}

        {/* Coverage */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Coverage</p>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Automation coverage</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Prompt */}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MousePointerClick className="w-6 h-6 text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">Click a node in the graph to inspect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <button
        onClick={() => {/* parent will handle via selectedNodeId state reset */}}
        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        {/* Clicking another node or the overview will clear */}
      </button>

      {/* Node header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', NODE_STYLE[selectedNode.type])}>
            {selectedNode.type}
          </span>
          {selectedNode.needs_clarification && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              ?
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 font-mono">{selectedNode.node_id}</p>
      </div>

      {/* Description */}
      {selectedNode.description && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Description</p>
          <p className="text-xs text-gray-600 leading-relaxed">{selectedNode.description}</p>
        </div>
      )}

      {/* Confidence */}
      {selectedNode.confidence_score != null && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Confidence</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-400"
                style={{ width: `${Math.round(selectedNode.confidence_score * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 tabular-nums">
              {Math.round(selectedNode.confidence_score * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Config */}
      {selectedNode.config && Object.keys(selectedNode.config).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Config</p>
          <div className="space-y-1">
            {Object.entries(selectedNode.config).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-gray-400 font-mono shrink-0">{key}:</span>
                <span className="text-gray-600 break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Position</p>
        <span className="text-xs text-gray-500">Step {selectedNode.position_index + 1}</span>
      </div>

      {/* Node contracts */}
      {nodeContracts.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Contracts ({nodeContracts.length})
          </p>
          <div className="space-y-2">
            {nodeContracts.map(c => (
              <NodeContractCard key={c.id} contract={c} />
            ))}
          </div>
        </div>
      )}

      {nodeContracts.length === 0 && (
        <div className="text-[11px] text-gray-400 flex items-center gap-1.5 py-2">
          <Shield className="w-3 h-3" />
          No contracts for this step
        </div>
      )}
    </div>
  );
}

/* ── Node Contract Card (compact) ── */

const CONTRACT_TYPE_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  must_always:  { label: 'Must Always', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  must_never:   { label: 'Must Never', bg: 'bg-red-50', text: 'text-red-700' },
  must_escalate: { label: 'Escalate', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-gray-400',
};

function NodeContractCard({ contract }: { contract: DerivedContract }) {
  const [expanded, setExpanded] = useState(false);
  const typeStyle = CONTRACT_TYPE_STYLE[contract.contract_type] ?? { label: contract.contract_type, bg: 'bg-gray-50', text: 'text-gray-600' };
  const sevDot = SEVERITY_DOT[contract.severity ?? 'medium'] ?? 'bg-gray-400';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-2.5 py-2 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sevDot)} />
          <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', typeStyle.bg, typeStyle.text)}>
            {typeStyle.label}
          </span>
          <span className={cn('text-[9px] px-1.5 py-0.5 rounded', contract.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
            {contract.status}
          </span>
        </div>
        <p className="text-[11px] font-medium text-gray-900">{contract.contract_name}</p>
        {!expanded && (
          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{contract.description}</p>
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-2.5 py-2 space-y-1.5">
          <p className="text-[11px] text-gray-600 leading-relaxed">{contract.description}</p>
          {contract.source_text && (
            <p className="text-[10px] text-gray-400 italic leading-relaxed">&ldquo;{contract.source_text.slice(0, 200)}{contract.source_text.length > 200 ? '...' : ''}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── History Tab ── */

function HistoryTab({
  asd,
  versions,
  selectedVersion,
  onSelectVersion,
  clarifications,
  onResolve,
  isResolving,
}: {
  asd: ASDDetail;
  versions: ASDVersionListItem[];
  selectedVersion: number | null;
  onSelectVersion: (v: number | null) => void;
  clarifications: Clarification[];
  onResolve: (id: string, resolution: string) => void;
  isResolving: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Versions */}
      {versions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            <History className="w-3 h-3 inline-block mr-1 -mt-0.5" />
            Versions ({versions.length})
          </p>
          <div className="space-y-1.5">
            {versions.map(v => {
              const isCurrent = v.version === asd.current_version;
              const isSelected = selectedVersion === v.version || (selectedVersion === null && isCurrent);
              return (
                <button
                  key={v.id}
                  onClick={() => onSelectVersion(isCurrent ? null : v.version)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-violet-50 border border-violet-200'
                      : 'bg-gray-50 border border-gray-100 hover:border-gray-200',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      isSelected ? 'text-violet-700' : 'text-gray-700',
                    )}>
                      v{v.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        current
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clarifications */}
      {clarifications.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Clarifications ({clarifications.length})
          </p>
          <div className="space-y-2">
            {clarifications.map(cl => (
              <ClarificationItem
                key={cl.id}
                clarification={cl}
                onResolve={onResolve}
                isResolving={isResolving}
              />
            ))}
          </div>
        </div>
      )}

      {versions.length === 0 && clarifications.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-8">No version history yet</p>
      )}
    </div>
  );
}
