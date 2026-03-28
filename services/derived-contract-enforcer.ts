import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import yaml from 'js-yaml';
import type { ContractResult } from '@/lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DslRule {
  id: string;
  condition: string;
  action: string;
  rationale?: string;
}

interface DslEscalation {
  id: string;
  condition: string;
  escalate_to: string;
  message: string;
  rationale?: string;
}

interface DslRules {
  must_always?: DslRule[];
  must_never?: DslRule[];
  escalate_when?: DslEscalation[];
}

interface ParsedContract {
  name: string;
  summary?: string;
  severity: string;
  rules: DslRules;
  on_violation?: {
    action: string;
    escalate_to?: string;
    message?: string;
  };
}

export interface DerivedContractRow {
  id: string;
  asd_id: string;
  contract_name: string;
  contract_type: string;
  description: string;
  severity: string | null;
  dsl_yaml: string | null;
  on_violation: Record<string, unknown> | null;
  status: string;
}

export type ViolationAction = 'BLOCK' | 'ESCALATE' | 'LOG';

export interface DerivedContractResult {
  contractId: string;
  contractName: string;
  result: ContractResult;
  reasoning: string;
  severity: string;
  violatedRules: Array<{ id: string; type: string; description: string }>;
  violationAction: ViolationAction;
  shouldBlock: boolean;
  shouldEscalate: boolean;
}

// ─── Judge system prompt ────────────────────────────────────────────────────

const DERIVED_JUDGE_SYSTEM = `You are a strict compliance evaluator for AI agent outputs.
You evaluate agent output against behavioral contracts derived from company Standard Operating Procedures (SOPs).
For each rule, determine if the agent's output complies or violates.
Respond ONLY with JSON:
{
  "result": "pass" | "fail",
  "reasoning": "Detailed explanation of compliance or violation",
  "violated_rules": ["rule_id_1", "rule_id_2"]
}
If all rules pass, violated_rules should be an empty array.`;

// ─── YAML parsing ───────────────────────────────────────────────────────────

function parseDslYaml(dslYaml: string): ParsedContract {
  const doc = yaml.load(dslYaml) as Record<string, unknown>;
  const contract = (doc && typeof doc === 'object' && 'contract' in doc)
    ? doc.contract as unknown as ParsedContract
    : doc as unknown as ParsedContract;
  return contract;
}

// ─── Judge prompt builder ───────────────────────────────────────────────────

function buildJudgePrompt(parsed: ParsedContract, agentOutput: string): string {
  const sections: string[] = [];

  sections.push(`Contract: ${parsed.name}`);
  sections.push(`Severity: ${parsed.severity}`);
  if (parsed.summary) sections.push(`Description: ${parsed.summary}`);
  sections.push('');
  sections.push('Rules to evaluate:');

  const rules = parsed.rules ?? {};

  if (rules.must_always?.length) {
    sections.push('');
    sections.push('MUST ALWAYS (the agent output must satisfy these):');
    for (const r of rules.must_always) {
      sections.push(`- [${r.id}] When ${r.condition} → Agent must: ${r.action}`);
      if (r.rationale) sections.push(`  (Rationale: ${r.rationale})`);
    }
  }

  if (rules.must_never?.length) {
    sections.push('');
    sections.push('MUST NEVER (the agent output must NOT exhibit these):');
    for (const r of rules.must_never) {
      sections.push(`- [${r.id}] When ${r.condition} → Agent must NOT: ${r.action}`);
      if (r.rationale) sections.push(`  (Rationale: ${r.rationale})`);
    }
  }

  if (rules.escalate_when?.length) {
    sections.push('');
    sections.push('ESCALATION TRIGGERS (if detected, flag for escalation):');
    for (const r of rules.escalate_when) {
      sections.push(`- [${r.id}] When ${r.condition} → Escalate to ${r.escalate_to}: ${r.message}`);
      if (r.rationale) sections.push(`  (Rationale: ${r.rationale})`);
    }
  }

  sections.push('');
  sections.push('─'.repeat(40));
  sections.push('');
  sections.push('Agent output to evaluate:');
  sections.push(agentOutput);

  return sections.join('\n');
}

// ─── Violation action resolution ────────────────────────────────────────────

const SEVERITY_ACTION_MAP: Record<string, ViolationAction> = {
  critical: 'BLOCK',
  high: 'BLOCK',
  medium: 'ESCALATE',
  low: 'LOG',
};

function resolveViolationAction(
  parsed: ParsedContract,
  row: DerivedContractRow,
): ViolationAction {
  const explicit = (row.on_violation as { action?: string } | null)?.action
    ?? parsed.on_violation?.action;
  if (explicit && ['BLOCK', 'ESCALATE', 'LOG'].includes(explicit)) {
    return explicit as ViolationAction;
  }
  return SEVERITY_ACTION_MAP[row.severity ?? parsed.severity ?? 'medium'] ?? 'LOG';
}

// ─── Build violated rules detail ────────────────────────────────────────────

function buildViolatedRulesDetail(
  violatedIds: string[],
  parsed: ParsedContract,
): Array<{ id: string; type: string; description: string }> {
  const idSet = new Set(violatedIds);
  const result: Array<{ id: string; type: string; description: string }> = [];
  const rules = parsed.rules ?? {};

  for (const r of rules.must_always ?? []) {
    if (idSet.has(r.id)) result.push({ id: r.id, type: 'must_always', description: r.action });
  }
  for (const r of rules.must_never ?? []) {
    if (idSet.has(r.id)) result.push({ id: r.id, type: 'must_never', description: r.action });
  }
  for (const r of rules.escalate_when ?? []) {
    if (idSet.has(r.id)) result.push({ id: r.id, type: 'escalate_when', description: r.message });
  }

  return result;
}

// ─── Main enforcer ──────────────────────────────────────────────────────────

export async function enforceDerivedContracts(
  agentOutput: string,
  agentExecutionId: string,
  anthropic: Anthropic,
  supabase: SupabaseClient,
  prefetchedContracts?: DerivedContractRow[],
): Promise<DerivedContractResult[]> {
  let contracts = prefetchedContracts;

  if (!contracts) {
    const { data } = await supabase
      .from('derived_contracts')
      .select('*')
      .eq('status', 'active')
      .not('dsl_yaml', 'is', null);
    contracts = (data ?? []) as DerivedContractRow[];
  }

  if (contracts.length === 0) return [];

  const results: DerivedContractResult[] = [];

  for (const row of contracts) {
    let result: ContractResult = 'skip';
    let reasoning = 'Evaluation skipped';
    let violatedRules: Array<{ id: string; type: string; description: string }> = [];
    let parsed: ParsedContract | null = null;

    try {
      parsed = parseDslYaml(row.dsl_yaml!);
    } catch (err) {
      reasoning = `YAML parse error: ${String(err)}`;
      results.push({
        contractId: row.id,
        contractName: row.contract_name,
        result: 'skip',
        reasoning,
        severity: row.severity ?? 'medium',
        violatedRules: [],
        violationAction: 'LOG',
        shouldBlock: false,
        shouldEscalate: false,
      });
      continue;
    }

    const violationAction = resolveViolationAction(parsed, row);

    try {
      const prompt = buildJudgePrompt(parsed, agentOutput);
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: DERIVED_JUDGE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        const cleaned = text.text.replace(/```(?:json)?\n?/g, '').trim();
        const judged = JSON.parse(cleaned) as {
          result: 'pass' | 'fail';
          reasoning: string;
          violated_rules?: string[];
        };
        result = judged.result;
        reasoning = judged.reasoning;

        if (judged.violated_rules?.length && parsed) {
          violatedRules = buildViolatedRulesDetail(judged.violated_rules, parsed);
        }
      }
    } catch (err) {
      result = 'fail';
      reasoning = `Evaluation error: ${String(err)}`;
    }

    const shouldBlock = result === 'fail' && violationAction === 'BLOCK';
    const shouldEscalate = result === 'fail' && violationAction === 'ESCALATE';

    results.push({
      contractId: row.id,
      contractName: row.contract_name,
      result,
      reasoning,
      severity: row.severity ?? parsed?.severity ?? 'medium',
      violatedRules,
      violationAction,
      shouldBlock,
      shouldEscalate,
    });
  }

  return results;
}
