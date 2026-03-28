'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, CheckCircle2, Eye,
  ChevronDown, ChevronRight, Loader2, Play,
  XCircle, Archive,
} from 'lucide-react';
import type {
  ContractListData, DerivedContract, ContractFinding,
  ContractSeverity, ContractStatus, FindingStatus, FindingType,
} from '@/lib/knowledge-types';
import { cn } from '@/lib/cn';

/* ── Style maps ── */

const SEVERITY_STYLE: Record<ContractSeverity, { bg: string; text: string; icon: typeof Shield }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', icon: ShieldAlert },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', icon: ShieldAlert },
  medium:   { bg: 'bg-amber-50', text: 'text-amber-700', icon: Shield },
  low:      { bg: 'bg-gray-50', text: 'text-gray-600', icon: Shield },
};

const STATUS_STYLE: Record<ContractStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-emerald-50 text-emerald-700',
  suspended: 'bg-amber-50 text-amber-600',
  archived:  'bg-gray-100 text-gray-400',
};

const FINDING_STATUS_STYLE: Record<FindingStatus, { bg: string; text: string }> = {
  unresolved:        { bg: 'bg-red-50', text: 'text-red-700' },
  needs_human_review: { bg: 'bg-amber-50', text: 'text-amber-700' },
  resolved:          { bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

const FINDING_TYPE_LABEL: Record<FindingType, string> = {
  coverage_gap:         'Coverage Gap',
  consistency_conflict: 'Consistency Conflict',
  executability_error:  'Executability Error',
};

/* ── Main component ── */

interface Props {
  asdId: string;
}

export default function ContractReviewPanel({ asdId }: Props) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ContractListData>({
    queryKey: ['contracts', asdId],
    queryFn: async () => {
      const res = await fetch(`/api/knowledge/contracts?asd_id=${asdId}`);
      return res.json();
    },
    enabled: !!asdId,
  });

  const generate = useMutation({
    mutationFn: () =>
      fetch(`/api/knowledge/contracts/generate/${asdId}`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts', asdId] });
      qc.invalidateQueries({ queryKey: ['asd-detail', asdId] });
    },
  });

  const activate = useMutation({
    mutationFn: (contractId: string) =>
      fetch(`/api/knowledge/contracts/${contractId}/activate`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', asdId] }),
  });

  const dismiss = useMutation({
    mutationFn: ({ contractId, reason }: { contractId: string; reason: string }) =>
      fetch(`/api/knowledge/contracts/${contractId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts', asdId] }),
  });

  const contracts = data?.contracts ?? [];
  const findings = data?.findings ?? [];
  const gate = data?.activation_gate;
  const latestRun = data?.latest_run;

  const activeContracts = contracts.filter(c => c.status !== 'archived');
  const unresolvedFindings = findings.filter(f => f.status === 'unresolved' || f.status === 'needs_human_review');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Activation gate banner */}
      {gate && activeContracts.length > 0 && (
        <div className={cn(
          'flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs',
          gate.can_activate
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50/50 border-amber-200 text-amber-800',
        )}>
          {gate.can_activate ? (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">
              {gate.can_activate ? 'Ready to activate' : 'Not ready to activate'}
            </p>
            {gate.reasons.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] opacity-80">
                {gate.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Pipeline status / generate button */}
      {latestRun && latestRun.status === 'running' ? (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Pipeline running: {latestRun.current_agent ?? 'starting'}...</span>
        </div>
      ) : (
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md transition-colors',
            generate.isPending
              ? 'bg-gray-100 text-gray-400 cursor-wait'
              : 'bg-violet-600 hover:bg-violet-700 text-white',
          )}
        >
          {generate.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {contracts.length === 0 ? 'Generate Contracts' : 'Regenerate'}
        </button>
      )}

      {latestRun?.status === 'failed' && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Pipeline failed: {latestRun.error ?? 'Unknown error'}</span>
        </div>
      )}

      {/* Contract cards */}
      {activeContracts.length > 0 && (
        <div className="space-y-2">
          {activeContracts.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              onActivate={() => activate.mutate(c.id)}
              onDismiss={(reason) => dismiss.mutate({ contractId: c.id, reason })}
              isActivating={activate.isPending}
            />
          ))}
        </div>
      )}

      {activeContracts.length === 0 && !isLoading && (
        <p className="text-xs text-gray-400 text-center py-4">
          No contracts generated yet
        </p>
      )}

      {/* Findings */}
      {unresolvedFindings.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Findings <span className="font-normal">({unresolvedFindings.length})</span>
          </p>
          <div className="space-y-1.5">
            {unresolvedFindings.map(f => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Contract card ── */

function ContractCard({
  contract,
  onActivate,
  onDismiss,
  isActivating,
}: {
  contract: DerivedContract;
  onActivate: () => void;
  onDismiss: (reason: string) => void;
  isActivating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismiss, setShowDismiss] = useState(false);

  const sev = contract.severity ?? 'medium';
  const sevStyle = SEVERITY_STYLE[sev];
  const SevIcon = sevStyle.icon;
  const violationAction = (contract.on_violation as Record<string, string>)?.action ?? '—';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-gray-400 mt-1 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400 mt-1 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', sevStyle.bg, sevStyle.text)}>
              {sev}
            </span>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', STATUS_STYLE[contract.status])}>
              {contract.status}
            </span>
            <span className="text-[10px] text-gray-400">{violationAction}</span>
          </div>
          <p className="text-xs font-medium text-gray-900 mt-1">{contract.contract_name}</p>
          <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{contract.description}</p>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2.5 space-y-2">
          {contract.source_text && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Source</p>
              <p className="text-[11px] text-gray-500 italic leading-relaxed">&ldquo;{contract.source_text}&rdquo;</p>
            </div>
          )}

          {contract.scope_node_ids && contract.scope_node_ids.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Scope</p>
              <div className="flex flex-wrap gap-1">
                {contract.scope_node_ids.map(id => (
                  <span key={id} className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contract.dsl_yaml && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">YAML DSL</p>
              <pre className="text-[10px] text-gray-600 bg-gray-50 border border-gray-100 rounded-md p-2 overflow-x-auto max-h-48 leading-relaxed">
                {contract.dsl_yaml}
              </pre>
            </div>
          )}

          {/* Actions */}
          {contract.status === 'draft' && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <button
                onClick={(e) => { e.stopPropagation(); onActivate(); }}
                disabled={isActivating}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="w-3 h-3" />
                Activate
              </button>
              {!showDismiss ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDismiss(true); }}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Archive className="w-3 h-3" />
                  Dismiss
                </button>
              ) : (
                <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                  <input
                    value={dismissReason}
                    onChange={e => setDismissReason(e.target.value)}
                    placeholder="Reason..."
                    className="flex-1 text-[11px] px-2 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-violet-500/20"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && dismissReason.trim()) {
                        onDismiss(dismissReason.trim());
                        setShowDismiss(false);
                        setDismissReason('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (dismissReason.trim()) {
                        onDismiss(dismissReason.trim());
                        setShowDismiss(false);
                        setDismissReason('');
                      }
                    }}
                    disabled={!dismissReason.trim()}
                    className="text-[11px] font-medium px-2 py-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Finding row ── */

function FindingRow({ finding }: { finding: ContractFinding }) {
  const fStyle = FINDING_STATUS_STYLE[finding.status];
  const typeLabel = FINDING_TYPE_LABEL[finding.finding_type] ?? finding.finding_type;

  return (
    <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2">
      <AlertTriangle className={cn('w-3 h-3 shrink-0 mt-0.5', fStyle.text)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', fStyle.bg, fStyle.text)}>
            {finding.status.replace('_', ' ')}
          </span>
          <span className="text-[9px] text-gray-400">{typeLabel}</span>
        </div>
        <p className="text-[11px] text-gray-700 leading-relaxed">{finding.description}</p>
        {finding.resolution && (
          <p className="text-[10px] text-gray-500 mt-0.5 italic">{finding.resolution}</p>
        )}
      </div>
    </div>
  );
}
