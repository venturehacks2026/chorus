import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Contract, ContractResult } from 'chorus-shared';

export interface ContractValidationResult {
  contractId: string;
  result: ContractResult;
  reasoning: string;
}

const JUDGE_SYSTEM = `You are a strict, impartial evaluator for AI agent outputs.
Your job is to assess whether an AI agent completed a specific task correctly.
You will be given the agent's complete output and a specific criterion to evaluate.
Respond ONLY with a JSON object: { "result": "pass" | "fail", "reasoning": "..." }
Be precise and specific in your reasoning. Do not be lenient — if there is doubt, mark as fail.`;

export async function validateContracts(
  contracts: Contract[],
  agentOutput: string,
  agentExecutionId: string,
  anthropic: Anthropic,
  supabase: SupabaseClient,
): Promise<ContractValidationResult[]> {
  const results: ContractValidationResult[] = [];

  for (const contract of contracts) {
    const userMessage = `Agent task criterion: ${contract.description}

Specific evaluation instruction:
${contract.judge_prompt}

Agent output:
${agentOutput}

Evaluate whether the agent successfully completed the criterion. Respond with JSON only.`;

    let result: ContractResult = 'skip';
    let reasoning = 'Evaluation skipped';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        const json = JSON.parse(text.text.replace(/```(?:json)?\n?/g, '').trim()) as {
          result: 'pass' | 'fail';
          reasoning: string;
        };
        result = json.result;
        reasoning = json.reasoning;
      }
    } catch (err) {
      reasoning = `Evaluation error: ${String(err)}`;
      result = 'fail';
    }

    // Persist result
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
