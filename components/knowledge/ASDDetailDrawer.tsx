'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ArrowRight } from 'lucide-react';
import type { ASDDetail, Clarification, NodeType, EdgeType, ContractType, ASDStatus } from '@/lib/knowledge-types';
import ClarificationItem from './ClarificationItem';
import { cn } from '@/lib/cn';

const NODE_STYLE: Record<NodeType, string> = {
  action:        'bg-blue-50 text-blue-600',
  decision:      'bg-amber-50 text-amber-600',
  human_handoff: 'bg-rose-50 text-rose-600',
  wait:          'bg-gray-100 text-gray-500',
  start:         'bg-emerald-50 text-emerald-700',
  end:           'bg-emerald-50 text-emerald-700',
  error:         'bg-red-50 text-red-600',
};

const EDGE_STYLE: Record<EdgeType, string> = {
  sequential:    'text-gray-500',
  true_branch:   'text-emerald-600',
  false_branch:  'text-red-500',
  error_handler: 'text-amber-500',
};

const CONTRACT_STYLE: Record<ContractType, string> = {
  must_always:   'bg-emerald-50 text-emerald-700',
  must_never:    'bg-red-50 text-red-600',
  must_escalate: 'bg-amber-50 text-amber-600',
};

const STATUS_STYLE: Record<ASDStatus, string> = {
  compiling:           'bg-blue-50 text-blue-600',
  active:              'bg-emerald-50 text-emerald-700',
  needs_clarification: 'bg-amber-50 text-amber-600',
  needs_recompile:     'bg-red-50 text-red-600',
  archived:            'bg-gray-100 text-gray-500',
};

interface Props {
  asdId: string;
  onClose: () => void;
}

export default function ASDDetailDrawer({ asdId, onClose }: Props) {
  const qc = useQueryClient();

  const { data: asd, isLoading } = useQuery<ASDDetail>({
    queryKey: ['asd-detail', asdId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/asds/${asdId}`);
      return res.json();
    },
    enabled: !!asdId,
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

  const version = asd?.latest_version;
  const nodes = version?.nodes ?? [];
  const edges = version?.edges ?? [];
  const contracts = asd?.contracts ?? [];
  const coverage = asd?.automation_coverage_score ?? 0;
  const pct = Math.round(coverage * 100);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-[28rem] h-full bg-white border-l border-gray-200 flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <p className="font-semibold text-sm truncate">{asd?.skill_id ?? 'Loading…'}</p>
              {asd && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_STYLE[asd.status])}>
                    {asd.status}
                  </span>
                  <span className="text-[11px] text-gray-400">v{asd.current_version}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            </div>
          ) : asd ? (
            <>
              {/* description */}
              {asd.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{asd.description}</p>
              )}

              {/* coverage */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Coverage</p>
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

              {/* nodes */}
              {nodes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    Nodes <span className="text-gray-400 font-normal">({nodes.length})</span>
                  </p>
                  <div className="space-y-1.5">
                    {nodes.sort((a, b) => a.position_index - b.position_index).map(node => (
                      <div key={node.id} className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5', NODE_STYLE[node.type])}>
                          {node.type}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 font-mono">{node.node_id}</p>
                          {node.description && (
                            <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{node.description}</p>
                          )}
                        </div>
                        {node.confidence_score != null && (
                          <span className="text-[10px] text-gray-400 tabular-nums shrink-0 ml-auto">
                            {Math.round(node.confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* edges */}
              {edges.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    Edges <span className="text-gray-400 font-normal">({edges.length})</span>
                  </p>
                  <div className="space-y-1">
                    {edges.map(edge => (
                      <div key={edge.id} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
                        <span className="font-mono text-gray-900">{edge.from_node_id}</span>
                        <ArrowRight className={cn('w-3 h-3 shrink-0', EDGE_STYLE[edge.edge_type])} />
                        <span className="font-mono text-gray-900">{edge.to_node_id}</span>
                        {edge.condition_label && (
                          <span className="text-[10px] text-gray-400 ml-auto italic">{edge.condition_label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* contracts */}
              {contracts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    Contracts <span className="text-gray-400 font-normal">({contracts.length})</span>
                  </p>
                  <div className="space-y-2">
                    {contracts.map(c => (
                      <div key={c.id} className="border border-gray-200 rounded-lg px-3 py-2.5 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', CONTRACT_STYLE[c.contract_type])}>
                            {c.contract_type}
                          </span>
                          <span className="text-xs font-medium text-gray-900">{c.contract_name}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* clarifications */}
              {clarifications.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    Clarifications <span className="text-gray-400 font-normal">({clarifications.length})</span>
                  </p>
                  <div className="space-y-2">
                    {clarifications.map(cl => (
                      <ClarificationItem
                        key={cl.id}
                        clarification={cl}
                        onResolve={(id, resolution) => resolve.mutate({ id, resolution })}
                        isResolving={resolve.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500">Failed to load ASD details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
