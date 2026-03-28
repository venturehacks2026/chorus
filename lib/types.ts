// ─── Status enums ────────────────────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'running' | 'completed' | 'failed';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'skipped';
export type StepKind = 'llm_call' | 'tool_call' | 'contract_check' | 'routing';
export type ContractResult = 'pass' | 'fail' | 'skip';

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nl_prompt: string | null;
  graph_json: WorkflowGraph;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkflowGraph {
  agents: AgentNodeData[];
  edges: AgentEdge[];
}

export interface AgentNodeData {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  max_tokens: number;
  tools: AgentTool[];
  position: { x: number; y: number };
  [key: string]: unknown; // Required by React Flow
}

export interface AgentTool {
  id: string;
  connector_id: string;
  label: string;
  config: Record<string, unknown>;
}

export interface AgentEdge {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  label?: string;
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export interface Contract {
  id: string;
  workflow_id: string;
  agent_id: string;
  description: string;
  judge_prompt: string;
  sequence: number;
  blocking: boolean;
}

export interface ContractResultRecord {
  id: string;
  contract_id: string;
  agent_execution_id: string;
  result: ContractResult;
  judge_reasoning: string;
  created_at: string;
}

// ─── Executions ──────────────────────────────────────────────────────────────

export interface Execution {
  id: string;
  workflow_id: string;
  status: WorkflowStatus;
  triggered_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface AgentExecution {
  id: string;
  execution_id: string;
  agent_id: string;
  status: AgentStatus;
  input_context: unknown;
  output_context: unknown | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface ExecutionStep {
  id: string;
  agent_execution_id: string;
  kind: StepKind;
  sequence: number;
  payload: StepPayload;
  created_at: string;
}

export type StepPayload =
  | LlmCallPayload
  | ToolCallPayload
  | ContractCheckPayload
  | RoutingPayload;

export interface LlmCallPayload {
  kind: 'llm_call';
  delta?: string;
  full_text?: string;
  model?: string;
}

export interface ToolCallPayload {
  kind: 'tool_call';
  tool_name: string;
  tool_use_id: string;
  input?: unknown;
  output?: string;
  error?: string;
}

export interface ContractCheckPayload {
  kind: 'contract_check';
  contract_id: string;
  description: string;
  result: ContractResult;
  reasoning: string;
}

export interface RoutingPayload {
  kind: 'routing';
  message: string;
  next_agent_id?: string;
}

// ─── Connectors ──────────────────────────────────────────────────────────────

export interface Connector {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  config_schema: Record<string, ConfigField>;
  vault_secret_keys: string[];
  built_at: string;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean';
  label: string;
  required: boolean;
  secret: boolean;
  default?: unknown;
  placeholder?: string;
}
