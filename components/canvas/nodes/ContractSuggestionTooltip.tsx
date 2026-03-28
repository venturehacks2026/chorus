'use client';

import { useState } from 'react';
import { Shield, Plus, X } from 'lucide-react';
import type { BaseNodeData } from '@/lib/types';

const COMPLIANCE_PATTERNS = [
  { pattern: /\bmust\s+(always|ensure|verify|check|confirm)\b/i, ruleType: 'must_always' as const, prefix: 'must-always' },
  { pattern: /\b(never|must\s+not|do\s+not|prohibited|forbidden)\b/i, ruleType: 'must_never' as const, prefix: 'must-never' },
  { pattern: /\b(escalat|approv|review|sign.?off|manager|supervisor)\b/i, ruleType: 'must_escalate' as const, prefix: 'must-escalate' },
  { pattern: /\b(within\s+\d+\s*(hour|minute|day|h|m|d)s?)\b/i, ruleType: 'must_always' as const, prefix: 'must-always' },
];

export function detectComplianceLanguage(text: string): Array<{ rule: string; ruleType: 'must_always' | 'must_never' | 'must_escalate' }> {
  const suggestions: Array<{ rule: string; ruleType: 'must_always' | 'must_never' | 'must_escalate' }> = [];
  for (const { pattern, ruleType, prefix } of COMPLIANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      suggestions.push({ rule: `${prefix}: ${text.slice(0, 80)}...`, ruleType });
    }
  }
  return suggestions;
}

interface Props {
  data: BaseNodeData;
  onCreateContract?: (rule: string, ruleType: string) => void;
}

export default function ContractSuggestionTooltip({ data, onCreateContract }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const suggestions = data.suggestedContracts?.length
    ? data.suggestedContracts
    : detectComplianceLanguage(data.description ?? '');

  if (suggestions.length === 0) return null;

  const existingContracts = data.contracts?.filter((c) => c.state === 'active') ?? [];
  if (existingContracts.length > 0 && !data.suggestedContracts?.length) return null;

  const RULE_COLORS = {
    must_always: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    must_never: 'bg-red-100 text-red-800 border-red-300',
    must_escalate: 'bg-amber-100 text-amber-800 border-amber-300',
  };

  return (
    <div className="absolute -top-2 left-full ml-2 z-50 w-56 bg-input border border-input-border rounded-lg shadow-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-sand-600" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Suggested contracts</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-text-subtle hover:text-text">
          <X className="w-3 h-3" />
        </button>
      </div>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded border whitespace-nowrap mt-0.5 ${RULE_COLORS[s.ruleType]}`}>
            {s.ruleType.replace('_', ' ').toUpperCase()}
          </span>
          <p className="text-[10px] text-text-muted leading-tight flex-1">{s.rule}</p>
          {onCreateContract && (
            <button
              onClick={() => onCreateContract(s.rule, s.ruleType)}
              className="w-4 h-4 rounded flex items-center justify-center bg-sand-400/20 hover:bg-sand-400/40 text-sand-700 flex-shrink-0 mt-0.5"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
