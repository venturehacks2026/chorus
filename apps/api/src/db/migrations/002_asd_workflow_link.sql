-- Link workflows back to their source ASD (Agent Skill Document)
alter table workflows add column if not exists source_asd_id text;
