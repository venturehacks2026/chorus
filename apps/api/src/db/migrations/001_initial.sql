-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Workflows ────────────────────────────────────────────────────────────────
create table if not exists workflows (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  nl_prompt   text,
  graph_json  jsonb not null default '{"agents":[],"edges":[]}',
  status      text not null default 'draft'
               check (status in ('draft','running','completed','failed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workflows_updated_at
  before update on workflows
  for each row execute function update_updated_at();

-- ─── Contracts ───────────────────────────────────────────────────────────────
create table if not exists contracts (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references workflows(id) on delete cascade,
  agent_id     text not null,
  description  text not null,
  judge_prompt text not null,
  sequence     int  not null default 0,
  blocking     boolean not null default false
);

create index if not exists contracts_workflow_agent on contracts(workflow_id, agent_id);

-- ─── Executions ──────────────────────────────────────────────────────────────
create table if not exists executions (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references workflows(id) on delete cascade,
  status       text not null default 'running'
                check (status in ('running','completed','failed')),
  triggered_at timestamptz not null default now(),
  completed_at timestamptz,
  error        text
);

create index if not exists executions_workflow on executions(workflow_id);

-- ─── Agent Executions ────────────────────────────────────────────────────────
create table if not exists agent_executions (
  id               uuid primary key default gen_random_uuid(),
  execution_id     uuid not null references executions(id) on delete cascade,
  agent_id         text not null,
  status           text not null default 'idle'
                    check (status in ('idle','running','completed','failed','skipped')),
  input_context    jsonb,
  output_context   jsonb,
  started_at       timestamptz,
  completed_at     timestamptz,
  error            text
);

create index if not exists agent_executions_execution on agent_executions(execution_id);

-- ─── Execution Steps ─────────────────────────────────────────────────────────
create table if not exists execution_steps (
  id                  uuid primary key default gen_random_uuid(),
  agent_execution_id  uuid not null references agent_executions(id) on delete cascade,
  kind                text not null
                       check (kind in ('llm_call','tool_call','contract_check','routing')),
  sequence            int not null,
  payload             jsonb not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists execution_steps_agent_exec on execution_steps(agent_execution_id, sequence);

-- ─── Contract Results ────────────────────────────────────────────────────────
create table if not exists contract_results (
  id                  uuid primary key default gen_random_uuid(),
  contract_id         uuid not null references contracts(id) on delete cascade,
  agent_execution_id  uuid not null references agent_executions(id) on delete cascade,
  result              text not null check (result in ('pass','fail','skip')),
  judge_reasoning     text not null,
  created_at          timestamptz not null default now()
);

create index if not exists contract_results_agent_exec on contract_results(agent_execution_id);

-- ─── Connectors (catalog) ────────────────────────────────────────────────────
create table if not exists connectors (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  description       text not null,
  icon_url          text,
  config_schema     jsonb not null default '{}',
  vault_secret_keys text[] not null default '{}',
  built_at          timestamptz not null default now()
);

-- ─── Seed connectors ─────────────────────────────────────────────────────────
insert into connectors (slug, name, description, vault_secret_keys, config_schema) values
(
  'web-search',
  'Web Search',
  'Search the web using Brave Search API and return top results for a query.',
  array['brave_api_key'],
  '{"max_results": {"type": "number", "label": "Max Results", "required": false, "secret": false, "default": 5}}'
),
(
  'perplexity',
  'Perplexity Research',
  'Deep research queries using Perplexity AI. Returns comprehensive, sourced answers.',
  array['perplexity_api_key'],
  '{"model": {"type": "string", "label": "Model", "required": false, "secret": false, "default": "sonar-pro"}}'
),
(
  'http',
  'HTTP Request',
  'Make arbitrary GET or POST HTTP requests to any URL.',
  array[]::text[],
  '{"base_url": {"type": "string", "label": "Base URL", "required": false, "secret": false, "placeholder": "https://api.example.com"}}'
),
(
  'code-executor',
  'Code Executor',
  'Execute JavaScript or Python code snippets in a sandboxed environment and return stdout.',
  array[]::text[],
  '{"language": {"type": "string", "label": "Language", "required": false, "secret": false, "default": "javascript"}}'
),
(
  'file-reader',
  'File Reader',
  'Read and parse text content from local file paths or public URLs.',
  array[]::text[],
  '{}'
),
(
  'memory',
  'Memory Store',
  'Store and retrieve key-value pairs within a single workflow execution.',
  array[]::text[],
  '{}'
)
on conflict (slug) do nothing;

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
-- Run this after creating the tables in Supabase:
-- alter publication supabase_realtime add table executions;
-- alter publication supabase_realtime add table agent_executions;
-- alter publication supabase_realtime add table execution_steps;
-- alter publication supabase_realtime add table contract_results;
