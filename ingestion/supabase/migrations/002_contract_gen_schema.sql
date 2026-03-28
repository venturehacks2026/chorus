-- Contract Generation Pipeline Schema
-- Extends derived_contracts and adds findings + pipeline run tables

-- New enums
CREATE TYPE contract_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE violation_action AS ENUM ('BLOCK', 'ESCALATE', 'LOG');
CREATE TYPE finding_type AS ENUM ('coverage_gap', 'consistency_conflict', 'executability_error');
CREATE TYPE finding_status AS ENUM ('resolved', 'unresolved', 'needs_human_review');

-- Extend derived_contracts with new columns
ALTER TABLE derived_contracts
  ADD COLUMN IF NOT EXISTS severity contract_severity,
  ADD COLUMN IF NOT EXISTS dsl_yaml text,
  ADD COLUMN IF NOT EXISTS on_violation jsonb,
  ADD COLUMN IF NOT EXISTS generation_run_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS derived_contracts_updated_at ON derived_contracts;
CREATE TRIGGER derived_contracts_updated_at
  BEFORE UPDATE ON derived_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Contract findings table
CREATE TABLE IF NOT EXISTS contract_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asd_id uuid NOT NULL REFERENCES agent_skill_documents(id) ON DELETE CASCADE,
  generation_run_id uuid NOT NULL,
  contract_id uuid REFERENCES derived_contracts(id) ON DELETE SET NULL,
  finding_type finding_type NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  details jsonb DEFAULT '{}',
  status finding_status DEFAULT 'unresolved',
  resolution text,
  resolved_at timestamptz,
  loop_iteration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_findings_asd_id ON contract_findings (asd_id);
CREATE INDEX IF NOT EXISTS idx_contract_findings_run_id ON contract_findings (generation_run_id);

-- Pipeline run state (crash recovery)
CREATE TABLE IF NOT EXISTS contract_gen_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asd_id uuid NOT NULL REFERENCES agent_skill_documents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  current_agent text,
  loop_count integer DEFAULT 0,
  state_snapshot jsonb,
  error text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_gen_runs_asd_id ON contract_gen_runs (asd_id);

DROP TRIGGER IF EXISTS contract_gen_runs_updated_at ON contract_gen_runs;
CREATE TRIGGER contract_gen_runs_updated_at
  BEFORE UPDATE ON contract_gen_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
