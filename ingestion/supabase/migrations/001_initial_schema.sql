-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Enum types
create type source_type as enum ('pdf', 'docx', 'confluence', 'notion', 'text');
create type asd_status as enum ('compiling', 'active', 'needs_clarification', 'needs_recompile', 'archived');
create type node_type as enum ('action', 'decision', 'human_handoff', 'wait', 'start', 'end', 'error');
create type edge_type as enum ('sequential', 'true_branch', 'false_branch', 'error_handler');
create type clarification_status as enum ('pending', 'resolved', 'dismissed');
create type contract_type as enum ('must_always', 'must_never', 'must_escalate');
create type contract_status as enum ('draft', 'active', 'suspended', 'archived');

-- SOP Documents
create table sop_documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    source_type source_type not null,
    source_uri text,
    content_hash text not null,
    raw_text text not null,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Document Chunks (with vector embedding)
create table document_chunks (
    id uuid primary key default gen_random_uuid(),
    sop_id uuid not null references sop_documents(id) on delete cascade,
    chunk_index integer not null,
    content text not null,
    embedding vector(1536),
    structural_metadata jsonb default '{}',
    start_offset integer not null,
    end_offset integer not null,
    created_at timestamptz default now()
);

create index on document_chunks using hnsw (embedding vector_cosine_ops);
create index on document_chunks (sop_id);

-- Agent Skill Documents
create table agent_skill_documents (
    id uuid primary key default gen_random_uuid(),
    skill_id text unique not null,
    sop_id uuid not null references sop_documents(id) on delete cascade,
    current_version integer default 1,
    description text,
    preconditions jsonb,
    automation_gaps jsonb,
    automation_coverage_score float,
    status asd_status default 'compiling',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index on agent_skill_documents (sop_id);

-- ASD Versions
create table asd_versions (
    id uuid primary key default gen_random_uuid(),
    asd_id uuid not null references agent_skill_documents(id) on delete cascade,
    version integer not null,
    sop_content_hash text not null,
    compiled_by text,
    created_at timestamptz default now(),
    unique (asd_id, version)
);

-- ASD Nodes
create table asd_nodes (
    id uuid primary key default gen_random_uuid(),
    asd_version_id uuid not null references asd_versions(id) on delete cascade,
    node_id text not null,
    type node_type not null,
    description text,
    config jsonb default '{}',
    source_chunk_id uuid references document_chunks(id),
    confidence_score float,
    needs_clarification boolean default false,
    position_index integer not null
);

create index on asd_nodes (asd_version_id);

-- ASD Edges
create table asd_edges (
    id uuid primary key default gen_random_uuid(),
    asd_version_id uuid not null references asd_versions(id) on delete cascade,
    from_node_id text not null,
    to_node_id text not null,
    edge_type edge_type not null,
    condition_label text
);

create index on asd_edges (asd_version_id);

-- Clarification Requests
create table clarification_requests (
    id uuid primary key default gen_random_uuid(),
    asd_id uuid not null references agent_skill_documents(id) on delete cascade,
    node_id text,
    question text not null,
    context text,
    status clarification_status default 'pending',
    resolution text,
    resolved_at timestamptz,
    created_at timestamptz default now()
);

create index on clarification_requests (asd_id);

-- Derived Contracts
create table derived_contracts (
    id uuid primary key default gen_random_uuid(),
    asd_id uuid not null references agent_skill_documents(id) on delete cascade,
    contract_name text not null,
    contract_type contract_type not null,
    description text not null,
    source_text text,
    scope_node_ids jsonb,
    status contract_status default 'draft',
    created_at timestamptz default now()
);

create index on derived_contracts (asd_id);

-- Function for semantic search over document chunks
create or replace function match_chunks(
    query_embedding vector(1536),
    match_threshold float default 0.7,
    match_count int default 10,
    filter_sop_id uuid default null
)
returns table (
    id uuid,
    sop_id uuid,
    chunk_index integer,
    content text,
    structural_metadata jsonb,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        dc.id,
        dc.sop_id,
        dc.chunk_index,
        dc.content,
        dc.structural_metadata,
        1 - (dc.embedding <=> query_embedding) as similarity
    from document_chunks dc
    where
        (filter_sop_id is null or dc.sop_id = filter_sop_id)
        and 1 - (dc.embedding <=> query_embedding) > match_threshold
    order by dc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger sop_documents_updated_at
    before update on sop_documents
    for each row execute function update_updated_at();

create trigger agent_skill_documents_updated_at
    before update on agent_skill_documents
    for each row execute function update_updated_at();
