// Enums matching ingestion API
export type SourceType = 'pdf' | 'docx' | 'confluence' | 'notion' | 'text';
export type ASDStatus = 'compiling' | 'active' | 'needs_clarification' | 'needs_recompile' | 'archived';
export type NodeType = 'action' | 'decision' | 'human_handoff' | 'wait' | 'start' | 'end' | 'error';
export type EdgeType = 'sequential' | 'true_branch' | 'false_branch' | 'error_handler';
export type ClarificationStatus = 'pending' | 'resolved' | 'dismissed';
export type ContractType = 'must_always' | 'must_never' | 'must_escalate';
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'archived';
export type ContractSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingType = 'coverage_gap' | 'consistency_conflict' | 'executability_error';
export type FindingStatus = 'resolved' | 'unresolved' | 'needs_human_review';

// SOP
export interface SOPListItem {
  id: string;
  title: string;
  source_type: SourceType;
  created_at: string;
  updated_at?: string;
}

export interface SOPDetail extends SOPListItem {
  source_uri: string | null;
  content_hash: string;
  chunk_count: number;
  metadata?: Record<string, unknown>;
}

// ASD
export interface ASDListItem {
  id: string;
  skill_id: string;
  sop_id: string;
  description: string | null;
  status: ASDStatus;
  current_version: number;
  automation_coverage_score: number | null;
  created_at: string;
}

export interface ASDNode {
  id: string;
  node_id: string;
  type: NodeType;
  description: string | null;
  config: Record<string, unknown> | null;
  source_chunk_id: string | null;
  confidence_score: number | null;
  needs_clarification: boolean;
  position_index: number;
}

export interface ASDEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: EdgeType;
  condition_label: string | null;
}

export interface ASDVersion {
  id: string;
  version: number;
  sop_content_hash: string;
  compiled_by: string | null;
  nodes: ASDNode[];
  edges: ASDEdge[];
  created_at: string;
}

export interface DerivedContract {
  id: string;
  asd_id: string;
  contract_name: string;
  contract_type: ContractType;
  description: string;
  source_text: string | null;
  scope_node_ids: string[] | null;
  severity: ContractSeverity | null;
  dsl_yaml: string | null;
  on_violation: Record<string, unknown> | null;
  status: ContractStatus;
  generation_run_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ContractFinding {
  id: string;
  asd_id: string;
  generation_run_id: string;
  contract_id: string | null;
  finding_type: FindingType;
  severity: string;
  description: string;
  details: Record<string, unknown>;
  status: FindingStatus;
  resolution: string | null;
  resolved_at: string | null;
  loop_iteration: number;
  created_at: string;
}

export interface ContractGenRun {
  id: string;
  asd_id: string;
  status: string;
  current_agent: string | null;
  loop_count: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ActivationGate {
  can_activate: boolean;
  reasons: string[];
}

export interface ContractListData {
  contracts: DerivedContract[];
  findings: ContractFinding[];
  latest_run: ContractGenRun | null;
  activation_gate: ActivationGate | null;
}

export interface ASDDetail extends ASDListItem {
  preconditions: Record<string, unknown> | null;
  automation_gaps: unknown[] | null;
  latest_version: ASDVersion | null;
  contracts: DerivedContract[];
  updated_at: string;
}

export interface CompileResponse {
  asd_id: string;
  skill_id: string;
  status: ASDStatus;
  node_count: number;
  edge_count: number;
  automation_coverage_score: number;
  message: string;
}

// Clarification
export interface Clarification {
  id: string;
  asd_id: string;
  node_id: string | null;
  question: string;
  context: string | null;
  status: ClarificationStatus;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}
