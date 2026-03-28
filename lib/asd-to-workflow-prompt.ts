import type { ASDDetail, ASDNode, ASDEdge, DerivedContract, SOPDetail } from './knowledge-types';

interface PromptParts {
  systemPrompt: string;
  userMessage: string;
}

/**
 * Serializes ASD structure into a system prompt + user message pair
 * for Claude to generate a WorkflowGraph from.
 */
export function buildASDDeployPrompt(
  asd: ASDDetail,
  sop: SOPDetail | null,
  enabledSlugs: string[],
): PromptParts {
  const nodes = asd.latest_version?.nodes ?? [];
  const edges = asd.latest_version?.edges ?? [];
  const contracts = asd.contracts ?? [];

  // Pre-join contracts to their scoped nodes for easier consumption
  const nodeDescriptions = nodes
    .sort((a, b) => a.position_index - b.position_index)
    .map((node) => {
      const nodeContracts = contracts
        .filter((c) => c.scope_node_ids?.includes(node.node_id))
        .map((c) => ({
          name: c.contract_name,
          type: c.contract_type,
          description: c.description,
          severity: c.severity,
        }));
      return {
        node_id: node.node_id,
        type: node.type,
        description: node.description,
        config: node.config,
        position_index: node.position_index,
        scoped_contracts: nodeContracts.length > 0 ? nodeContracts : undefined,
      };
    });

  const edgeDescriptions = edges.map((e) => ({
    from: e.from_node_id,
    to: e.to_node_id,
    type: e.edge_type,
    label: e.condition_label ?? undefined,
  }));

  const systemPrompt = `You are a workflow architect for Chorus — an AI agent orchestration platform. You are converting an Agent Skill Document (ASD) — a structured SOP flowchart compiled from a Standard Operating Procedure — into an executable WorkflowGraph of AI agents.

The ASD contains typed nodes (action, decision, human_handoff, wait, start, end, error) connected by typed edges (sequential, true_branch, false_branch, error_handler). Your job is to translate this procedure into a multi-agent workflow.

━━━ NODE TYPE MAPPING RULES ━━━

ACTION nodes → Map to an agent. The node description is a short summary — expand it into a detailed system_prompt telling the agent exactly what to do, what data to gather or produce, and how to store results. Select appropriate tools based on what the action requires.

DECISION nodes → Do NOT create a separate agent. Fold the decision logic into the PRECEDING action agent's system_prompt as conditional instructions. Example: "After completing your task, evaluate: [condition from decision node]. State your conclusion clearly so the next agent can act on it."

HUMAN_HANDOFF nodes → Map to a "Handoff Coordinator" agent that compiles all context gathered so far into a structured handoff package, stores it via data-store, and clearly states what human review is needed. Include the escalation target and SLA from the node config if available.

WAIT nodes → Map to a "State Checkpoint" agent that summarizes the current state and stores it via data-store for later retrieval. Note the trigger condition or duration from the node config.

START nodes → Do NOT create an agent. Use the start node's description as additional context for the first real agent.

END nodes → Do NOT create an agent. The final agent should include "summarize all results and confirm completion" in its system_prompt.

ERROR nodes → Map to an "Error Handler" agent that logs the error context, determines severity, and stores an error report via data-store.

━━━ MERGING RULES ━━━
- Consecutive simple action nodes that are closely related (same domain, no branching between them) SHOULD be merged into a single agent with a compound system_prompt covering all merged steps.
- Never merge across decision boundaries or human_handoff points.
- Aim for 2–6 agents total. Fewer is better if the procedure is simple.

━━━ CONTRACT EMBEDDING ━━━
If a node has scoped_contracts, embed each as a constraint in the agent's system_prompt:
- must_always → "CONSTRAINT: You MUST always {description}"
- must_never → "CONSTRAINT: You MUST NEVER {description}"
- must_escalate → "CONSTRAINT: You MUST ESCALATE when {description}"

These constraints will be separately enforced by the contract system at runtime, but embedding them helps the agent comply proactively.

━━━ TOOL SELECTION GUIDE ━━━
- web-scraper: fetch and extract clean text/metadata from any URL
- rss-reader: read RSS/Atom feeds for news, blog posts, updates
- json-api: call any public JSON REST API (GitHub, weather, finance, etc.)
- web-search: search the web via Brave API
- perplexity: deep research queries
- code-executor: run JavaScript to compute, transform, analyze, or call APIs
- data-store: persist structured results so they survive and are visible in the Data tab — ALWAYS insert as {"field": value} objects
- http: raw HTTP requests when exact control is needed
- memory: ephemeral key-value within a single execution
- file-reader: read files from the local filesystem
- parallel-research: multiple concurrent research tasks

━━━ DATA STORAGE RULE ━━━
Any agent that produces structured output MUST include data-store in its tools and insert results as structured JSON objects with meaningful field names.

━━━ DESIGN RULES ━━━
- Agent IDs: "agent-1", "agent-2", etc. | Edge IDs: "edge-1", "edge-2", etc. | Tool IDs: "tool-1", "tool-2", etc.
- model: "claude-haiku-4-5-20251001" | max_tokens: 4096
- ONLY use tools from the provided connector slugs — never invent tool names

━━━ POSITIONS ━━━
- Sequential: x increases by 420, y = 200
- Parallel group: same x, y spaced by 180

Return ONLY valid JSON — no markdown, no explanation.

{
  "agents": [{
    "id": string,
    "name": string,
    "role": string,
    "system_prompt": string,
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 4096,
    "tools": [{ "id": string, "connector_id": string, "label": string, "config": {} }],
    "position": { "x": number, "y": number }
  }],
  "edges": [{ "id": string, "source_agent_id": string, "target_agent_id": string, "label": string }]
}`;

  const userMessage = [
    `Available connectors: ${enabledSlugs.join(', ')}`,
    `\n\n━━━ SOP CONTEXT ━━━`,
    `Title: ${sop?.title ?? asd.skill_id}`,
    `Description: ${asd.description ?? 'No description'}`,
    sop?.raw_text
      ? `\nOriginal SOP text (excerpt):\n${sop.raw_text.slice(0, 3000)}`
      : '',
    `\n\n━━━ ASD FLOWCHART NODES ━━━\n${JSON.stringify(nodeDescriptions, null, 2)}`,
    `\n\n━━━ ASD FLOWCHART EDGES ━━━\n${JSON.stringify(edgeDescriptions, null, 2)}`,
    `\n\nConvert this ASD flowchart into an executable WorkflowGraph that faithfully implements the SOP procedure.`,
  ].join('');

  return { systemPrompt, userMessage };
}
