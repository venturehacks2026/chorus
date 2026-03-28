# Project Specification

## What We Are Building

This platform bridges the gap between how humans document work and how AI
agents execute work. Today, companies have thousands of Standard Operating
Procedures (SOPs), policy documents, and process guides written for human
workers. These documents are invisible to AI agents. Agents either hallucinate
their own procedures or require months of custom engineering to follow
company-specific workflows.

This platform solves this by:
1. Ingesting existing human-facing SOPs and transforming them into
   agent-optimized representations
2. Visualizing these representations as editable procedural graphs
3. Deriving behavioral contracts that govern how agents must behave
4. Executing agents wrapped in those contracts with full SOP context
5. Providing a real-time dashboard that surfaces violations, stuck states,
   and execution history

The core insight is that the agent's representation of a workflow (the Agent
Skill Document) exists in parallel to the human SOP — same process, two
formats, kept in sync. When the SOP changes, the agent representation updates.
When an agent gets stuck or violates a rule, the human can edit either the
skill document or the contract directly in the UI.

---

## Core Vocabulary

These terms have precise meanings throughout the codebase. Use them
consistently.

**SOP (Standard Operating Procedure)**
A human-facing document describing how a business process should be executed.
May be a PDF, Word doc, Confluence page, or Notion page. SOPs are the source
of truth. The system never modifies them.

**ASD (Agent Skill Document)**
The agent-optimized parallel representation of an SOP. Structured as a DAG
(directed acyclic graph) of typed nodes. The ASD is what the agent actually
reads and follows during execution. It is derived from the SOP but stored
separately. It can be edited by humans in the UI without modifying the
original SOP.

**Agent Harness**
The full runtime wrapper around an agent: the ASD it follows, the contracts
enforced, the memory context available, and the connectors it can call. The
harness is what gets deployed when a user activates a workflow.

**Contract**
A formal behavioral specification for an agent. Contracts define what an
agent MUST ALWAYS do, MUST NEVER do, when it MUST ESCALATE to a human, and
what it MUST DO when it violates a rule. Contracts are enforced at runtime
at every tool call boundary — not as suggestions.

**Contract Enforcement**
The runtime middleware layer that intercepts every tool call an agent attempts
to make, evaluates it against all active contracts, and either permits,
blocks, or escalates the action before it executes. Enforcement is
pre-execution, not post-hoc.

**Connector**
An integration with an external system (Salesforce, Slack, Gmail, Jira, etc.)
that exposes typed tool calls the agent can invoke. Connectors are registered
in a central ConnectorRegistry. An ASD declares which connector tools it
needs; the harness provides only those tools — never full connector access.

**Execution**
A single run of an agent harness against a specific task. An execution has
a unique ID, a start time, an ASD and contract set, and a full event log.
Executions are the unit of observability.

**Execution Event**
A discrete, timestamped record of something that happened during an execution:
a node being entered, a tool call being attempted, a contract being evaluated,
a violation being triggered, a human handoff being requested, or the
execution completing or failing.

**Stuck State**
When an agent reaches a human_handoff node and the assigned human has not
responded within the expected SLA window defined in the ASD. A stuck state
is surfaced as an alert in the dashboard and remains open until resolved.

**Automation Gap**
A step in an ASD that cannot currently be automated — it requires physical
action, involves a missing connector, or requires human judgment that cannot
be encoded as a decision rule. Gaps are explicit, not silent. They compile
to human_handoff nodes and are surfaced in the dashboard with an explanation.

**Drift**
The state where a source SOP document has been updated but the corresponding
ASD has not yet been recompiled. Drift is detected automatically and surfaced
as a warning in the dashboard. The system never silently allows a stale ASD
to execute.

**Parallel Agent Database**
The complete collection of ASDs, contracts, connector configurations, and
execution history. It exists alongside the company's existing document
systems. It does not replace them. It is the agent's view of the
organization's processes.

---

## System Components

### 1. Ingestion Layer

**Purpose:** Transform raw human-facing documents into structured ASDs and
derive initial contracts.

**Inputs:** PDF, DOCX, Confluence pages, Notion pages, plain text

**Outputs:**
- ASD (Agent Skill Document) stored in the parallel agent database
- Draft contracts derived from compliance language in the source document
- List of automation gaps (steps that require human action)
- Automation coverage score (percentage of steps that can be automated)

**Key behaviors:**
- Never modifies the source document
- Surfaces ambiguities it cannot resolve rather than hallucinating answers
- Links every ASD node back to the source document section it came from
- Assigns a confidence score to each compiled node
- Flags contradictions between different sections of the same SOP
- Produces a version hash of the source document for drift detection

**The clarification gate:** When the ingestion layer encounters an ambiguity
it cannot resolve from context (e.g., "escalate to the manager" — which
manager, via which channel), it does not guess. It produces a structured
clarification request that a human must answer before that node is marked
as complete. Nodes with unresolved clarifications are marked as
`needs_clarification` in the ASD.

---

### 2. Parallel Agent Database

**Purpose:** Persistent storage for all agent-optimized representations,
their contracts, their version history, and their relationship to source
documents.

**What it stores:**
- Agent Skill Documents (versioned)
- Contracts (versioned, linked to ASD nodes)
- Source document metadata and version hashes (for drift detection)
- Connector configurations and credentials (encrypted)
- Execution logs and events
- Clarification requests and their resolutions
- Automation coverage scores

**Key design principles:**
- Every ASD and every contract is versioned. Nothing is ever deleted, only
  superseded. The version active at the time of any execution is always
  recoverable.
- The database is the single source of truth for what the agent knows and
  how it is permitted to behave.
- The React Flow graph in the UI is a rendered view of ASD data stored here.
  Edits made in the graph UI are written back to the database, not stored
  only in the frontend.

---

### 3. React Flow Graph Visualizer

**Purpose:** Provide a human-readable, human-editable visual representation
of ASDs. This is both a visualization tool and an editing interface.

**What it displays:**
- Every node in the ASD as a typed, color-coded visual node
- Edges between nodes showing execution flow
- Decision nodes with their conditions visible
- Human handoff nodes with assigned escalation target and SLA
- Contract overlays on nodes that have active contracts enforced
- Automation gap markers on nodes that cannot be automated
- Live execution state (which node is currently executing, in a live run)

**Node types:**
- `ActionNode` — a tool call or automated action
- `DecisionNode` — a conditional branch with a true and false path
- `HandoffNode` — a human escalation point
- `WaitNode` — a timer or external trigger
- `StartNode` — workflow entry point
- `EndNode` — successful completion
- `ErrorNode` — failure or unrecoverable state

**Editing behavior:**
- Editing a node's content in the graph writes back to the ASD in the
  parallel agent database
- Editing a node that has linked contracts surfaces a warning listing
  which contracts reference that node
- Adding or removing nodes triggers a contract re-derivation suggestion
  (user can accept or dismiss)
- All edits are versioned — the previous ASD version is preserved

**What it does NOT do:**
- It does not generate executable code directly
- It does not store state itself — it is always rendered from the database
- It does not allow editing during a live execution

---

### 4. Contract Builder

**Purpose:** Define, edit, and manage the behavioral constraints that govern
agent execution.

**How contracts are created:**
- **Auto-derived:** During ingestion, the system scans the source SOP for
  compliance language ("must get approval before," "never share with
  external parties," "always notify within 24 hours") and compiles these
  into draft contracts. These are drafts — a human must review and activate
  them before they are enforced.
- **Manually created:** A user can write a new contract from scratch in the
  contract editor UI using the contract DSL.
- **Graph-triggered:** When a user edits an ASD node in the graph that
  contains compliance language, the system suggests contract additions.

**Contract scope:**
Every contract is scoped to a specific ASD and optionally to specific nodes
within that ASD. A contract does not apply globally to all agents — it
applies to the specific workflow it governs. Contracts can also reference
global policies (e.g., a company-wide data privacy policy) that apply
across all ASDs.

**Contract states:**
- `draft` — auto-derived or newly created, not yet enforced
- `active` — reviewed, approved, and enforced at runtime
- `suspended` — temporarily disabled (requires reason and expiry)
- `archived` — superseded by a newer version

**The contract DSL:**
Contracts are written in a human-readable YAML-based domain-specific
language. They are not raw code and not natural language prompts. They are
structured, parseable, and testable. A compliance officer with no
engineering background should be able to read and understand a contract.
An engineer should be able to write one in under 5 minutes.

---

### 5. Execution Layer

**Purpose:** Run processes safely against real tasks, enforcing all
active contracts at every tool call, with full SOP context available.

**How an execution starts:**
A task arrives (via API, webhook, UI trigger, or scheduled job). The
execution layer routes the task to the correct ASD using semantic similarity
search over the parallel agent database. The correct ASD, its active
contracts, and required connector tools are loaded into the harness. The
harness begins executing.

**SOP routing:**
The execution layer does not load all SOPs into the agent's context. It
retrieves the single most relevant ASD for the incoming task using
semantic search, then validates that the task satisfies the ASD's
preconditions. If no ASD matches with sufficient confidence, the execution
does not start — it creates a clarification request instead.

**The contract enforcement interceptor:**
Every tool call the agent attempts is intercepted before execution. The
interceptor evaluates:
1. Preconditions — is the current state valid for this action?
2. Must-never rules — would this action violate any prohibition?
3. Escalation triggers — does this action require human approval?

If any check fails, the action is blocked and the violation policy executes
instead. The tool call never reaches the external system if blocked. If all
checks pass, the tool call executes, and postconditions are evaluated on
the output.

**Human handoff:**
When a human_handoff node is reached, execution pauses. The assigned human
receives a notification with full execution context. Execution resumes only
when the human responds. If the SLA window expires without a response, the
execution enters a stuck state and is surfaced in the dashboard.

**Context available during execution:**
The agent has access to three tiers of context:
- Active tier: the current ASD, active contracts, and current execution state
- On-demand tier: related policy documents, retrievable via tool call
- Background tier: all other ASDs, not in context but discoverable if
  the agent determines a context switch is needed

**What the agent cannot do:**
The agent cannot modify its own ASD or contracts during execution. It cannot
escalate its own permissions. It cannot call tools that are not registered
in its harness. It cannot skip a human_handoff node.

---

### 6. Dashboard

**Purpose:** Give operators, compliance officers, and business users full
visibility into what agents are doing, what went wrong, and the ability to
intervene or adjust.

**Core panels:**

*Execution Timeline*
A chronological view of all execution events for a given run. Shows every
node visited, every tool call made, every contract check result, and
every human handoff. Nodes are color-coded by outcome. The timeline
is linked to the React Flow graph — clicking a timeline event highlights
the corresponding node in the graph.

*Violation Feed*
A real-time and historical feed of contract violations across all executions.
Each violation entry shows: which execution, which node, which contract
rule was triggered, what the agent attempted, and what the enforcement
response was.

*Stuck Agent Queue*
All currently paused executions waiting for human response. Shows which
human is assigned, how long the execution has been waiting, and the
SLA countdown. Provides a one-click interface for the assigned human to
respond and resume execution.

*Drift Alerts*
Notifications when a source document has been updated and the corresponding
ASD has not yet been recompiled. Shows a diff of what changed in the
source and which ASD nodes may be affected.

*Inline Editors*
- Contract editor: edit any contract in the YAML DSL with syntax
  highlighting. Changes save as a new version and take effect on the
  next execution (never mid-execution).
- ASD node editor: click any node in the React Flow graph to edit its
  description, tool binding, decision condition, or escalation target.
  Edits trigger contract impact warnings if applicable.

*Coverage Score*
Per-ASD automation coverage percentage (how much of the SOP can be
automated vs. requires human action). Used for internal tracking and
ROI reporting.

---

## What This System Is Not

- **Not an RPA tool.** This platform does not record and replay UI clicks.
  It operates through typed API connectors.

- **Not a general-purpose agent platform.** Agents follow specific,
  company-defined SOPs. They do not autonomously decide what to do.

- **Not a document management system.** This platform does not manage or
  replace existing SOPs. It reads them and builds a parallel representation.

- **Not a monitoring tool bolted onto existing agents.** The contract
  enforcement layer is built into the execution harness, not added as
  an afterthought. Agents that do not run through the harness are not
  governed by contracts.

---

## Design Principles

**The SOP is always the source of truth.**
The system derives from SOPs. It never contradicts them. When drift is
detected, the ASD is updated — not the SOP.

**Contracts are enforced, not suggested.**
A contract violation blocks the action. It does not log a warning and allow
it anyway. Operators need guarantees, not best-effort compliance.

**Automation gaps are explicit.**
The system never silently skips a step it cannot automate. Every step the
agent cannot handle is surfaced as an explicit gap with an explanation.
Humans are always in the loop for things that require humans.

**Nothing executes without a provenance trail.**
Every execution event — every tool call, every contract check, every
human handoff — is logged with a timestamp, the active contract version,
and the ASD version. The full execution history is always recoverable.

**Edits are versioned, never destructive.**
Editing an ASD or contract never overwrites the previous version.
The version active at the time of any past execution is always
reconstructable.

**Least-privilege tool access.**
An agent executing a vendor onboarding SOP gets access only to the
tools that SOP requires. It does not get access to all Salesforce tools
because Salesforce is a registered connector. The harness scopes tool
access to exactly what the ASD declares it needs.
