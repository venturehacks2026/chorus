import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Contract, ContractResult } from '@/lib/types';

const JUDGE_SYSTEM = `You are a strict evaluator for AI agent outputs.
Assess whether an agent completed a specific criterion correctly.
Respond ONLY with JSON: { "result": "pass" | "fail", "reasoning": "..." }`;

export interface ContractValidationResult {
  contractId: string;
  result: ContractResult;
  reasoning: string;
}

export async function validateContracts(
  contracts: Contract[],
  agentOutput: string,
  agentExecutionId: string,
  anthropic: Anthropic,
  supabase: SupabaseClient,
): Promise<ContractValidationResult[]> {
  const results: ContractValidationResult[] = [];

  for (const contract of contracts) {
    let result: ContractResult = 'skip';
    let reasoning = 'Evaluation skipped';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: JUDGE_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Criterion: ${contract.description}\n\nJudge instruction:\n${contract.judge_prompt}\n\nAgent output:\n${agentOutput}`,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        const parsed = JSON.parse(text.text.replace(/```(?:json)?\n?/g, '').trim()) as {
          result: 'pass' | 'fail';
          reasoning: string;
        };
        result = parsed.result;
        reasoning = parsed.reasoning;
      }
    } catch (err) {
      result = 'fail';
      reasoning = `Evaluation error: ${String(err)}`;
    }

    await supabase.from('contract_results').insert({
      contract_id: contract.id,
      agent_execution_id: agentExecutionId,
      result,
      judge_reasoning: reasoning,
    });

    results.push({ contractId: contract.id, result, reasoning });
  }

  return results;
}
