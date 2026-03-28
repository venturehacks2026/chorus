# Chorus

Platform that bridges human SOPs and AI agent execution. Ingests human-facing Standard Operating Procedures, transforms them into agent-optimized representations (Agent Skill Documents / ASDs), enforces behavioral contracts at runtime, and provides full observability.

## Core Concepts

- **SOP** — Source-of-truth human process document (PDF, DOCX, Confluence, Notion). Never modified by the system.
- **ASD (Agent Skill Document)** — Agent-optimized DAG derived from an SOP. Typed nodes: `ActionNode`, `DecisionNode`, `HandoffNode`, `WaitNode`, `StartNode`, `EndNode`, `ErrorNode`. Versioned, editable via React Flow graph UI.
- **Contract** — YAML-DSL behavioral spec (must-always, must-never, must-escalate, violation-response). Scoped to an ASD and optionally specific nodes. States: `draft`, `active`, `suspended`, `archived`. Enforced pre-execution at every tool call boundary.
- **Agent Harness** — Runtime wrapper: ASD + contracts + scoped connector tools + memory context. Least-privilege tool access.
- **Connector** — Typed integration with external systems (Salesforce, Slack, Gmail, Jira, etc.) registered in a ConnectorRegistry. ASD declares which tools it needs; harness provides only those.
- **Execution** — Single run of a harness against a task. Has unique ID, full event log, linked ASD/contract versions.
- **Execution Event** — Timestamped record: node entry, tool call, contract evaluation, violation, handoff, completion/failure.
- **Stuck State** — Handoff node where assigned human hasn't responded within SLA window.
- **Automation Gap** — Step that can't be automated; compiles to `HandoffNode` with explanation.
- **Drift** — Source SOP updated but ASD not yet recompiled. Detected automatically, blocks stale execution.

## System Components

1. **Ingestion Layer** — Transforms SOPs into ASDs + draft contracts. Surfaces ambiguities as clarification requests rather than guessing. Produces version hash for drift detection.
2. **Parallel Agent Database** — Stores versioned ASDs, contracts, connector configs, execution logs, clarification requests, coverage scores. Single source of truth for agent behavior.
3. **React Flow Graph Visualizer** — Visual editor for ASDs. Color-coded typed nodes, contract overlays, live execution state. Edits write back to database and are versioned.
4. **Contract Builder** — Create/edit contracts via YAML DSL. Auto-derived from SOP compliance language, manually authored, or graph-triggered.
5. **Execution Layer** — Routes tasks to correct ASD via semantic search. Contract enforcement interceptor checks preconditions, must-never rules, and escalation triggers before every tool call. Human handoff pauses execution until response.
6. **Dashboard** — Execution timeline, violation feed, stuck agent queue, drift alerts, inline contract/ASD editors, coverage scores.

## Design Principles

- SOP is always source of truth
- Contracts are enforced, not suggested (violations block actions)
- Automation gaps are explicit, never silent
- Full provenance trail on every execution event
- Edits are versioned, never destructive
- Least-privilege tool access per harness

## Key Files

- `docs/SPEC.md` — Full project specification
