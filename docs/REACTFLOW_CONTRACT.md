# React Flow Graph Visualizer — Contract & Requirements

> The ASD Graph Visualizer is the visual nervous system of Chorus.
> It renders Agent Skill Documents as interactive DAGs, overlays behavioral
> contracts, surfaces live execution state, and writes edits back to the
> Parallel Agent Database. Every pixel must earn its place.

---

## 1. Platform Integration Context

### Where the Graph Lives

```
┌─────────────────────────────────────────────────────────────┐
│  Ingestion Layer                                            │
│  SOP (PDF/DOCX/Notion) → parse → ASD (DAG) + draft contracts│
│                              ↓                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │  Parallel Agent Database                          │      │
│  │  Versioned ASDs, contracts, execution logs        │      │
│  │  ↕ read/write                                     │      │
│  └───────────────────────────────────────────────────┘      │
│                              ↕                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │  ★ REACT FLOW GRAPH VISUALIZER ★                  │      │
│  │  Renders ASD → editable DAG → writes back to DB   │      │
│  │  + contract overlays + live execution tracing      │      │
│  └───────────────────────────────────────────────────┘      │
│                              ↕                              │
│  Dashboard (timeline, violations, stuck queue, drift)       │
│  Execution Layer (harness → contract enforcement → run)     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingest**: Database provides a versioned ASD (JSON DAG of typed nodes + edges) + associated contracts + execution state
2. **Render**: Graph visualizer renders the ASD as an interactive React Flow canvas
3. **Edit**: User modifies nodes/edges → changes serialize back to the database as a new ASD version
4. **Observe**: During live execution, the graph highlights the active node, shows contract check results, and streams execution events in real-time

### What the Graph Does NOT Do

- Does not generate executable code
- Does not store state itself (always rendered from database)
- Does not allow editing during a live execution (read-only overlay mode)
- Does not modify the source SOP

---

## 2. Design Direction

### Aesthetic: **Warm Precision**

Not a toy. Not a marketing page. This is a **control surface** for governing AI agent
behavior. The design language should feel like a **well-crafted instrument** — calm,
warm, and readable for hours. The sand palette creates a sense of organic trust and
approachability without sacrificing professionalism.

### Palette

Five base hexes: `#EDEDE9` `#D6CCC2` `#F5EBE0` `#E3D5CA` `#D5BDAF`

| Role | Hex | Token | Usage |
|------|-----|-------|-------|
| **Primary** | `#D5BDAF` | `sand-400` | Buttons, active states, accent borders, selection rings |
| **Secondary** | `#D6CCC2` | `sand-300` | Borders, hover backgrounds, edge strokes, grid dots |
| **Tertiary** | `#E3D5CA` | `sand-200` | Card backgrounds, panels, surface elevation |
| **Background** | `#EDEDE9` | `sand-100` | Page background, canvas |
| **Surface** | `#F5EBE0` | `sand-50` | Inputs, modals, elevated surfaces, node backgrounds |

Text uses warm earth tones: `#3D3228` (primary), `#7C6854` (muted), `#A68B6B` (subtle).

### Design Pillars

| Pillar | Meaning |
|--------|---------|
| **Clarity over decoration** | Every visual element communicates state. No ornamental gradients or floating blobs. |
| **Type-driven hierarchy** | Node types are instantly distinguishable by shape + color + icon — no need to read labels to identify intent. |
| **State is visible** | Active execution, violations, drift, stuck states — all surfaced through color, animation, and badges without requiring interaction. |
| **Density with breathing room** | Complex SOPs may have 30-80 nodes. The graph must handle density without visual collapse. Generous edge spacing, clear label hierarchy. |
| **Warm and sustained** | Light sand palette is easy on the eyes for extended monitoring. Operators and compliance officers use this for hours. |

### Reference Patterns Extracted from Yumi

The Yumi `friends-graph` implementation demonstrates clean React Flow patterns worth inheriting:

| Pattern | Yumi Implementation | Chorus Adaptation |
|---------|---------------------|-------------------|
| **Glass-morphism nodes** | `backdrop-filter: blur(24px)`, translucent backgrounds | Adapt to dark mode: use `rgba(15, 23, 42, 0.6)` with subtle blur for depth without distraction |
| **Memo'd custom components** | `export default memo(FriendNodeComponent)` | All 7 node types and all edge types must be `memo()`'d |
| **Hidden handles, all positions** | 4-directional source + target handles with `opacity: 0` | Same pattern — handles visible only on hover/connection drag |
| **Force-directed layout** | Custom `calculateForceDirectedPosition()` | Use **dagre** for DAG layout (top-to-bottom workflow flow), not force-directed |
| **Custom edges with labels** | `EdgeLabelRenderer` + `getBezierPath` + click-to-expand tooltip | Contract badge edges using same `EdgeLabelRenderer` pattern |
| **Detail panel in `<Panel>`** | `<Panel position="top-right">` with animated slide-in | Node inspector panel for editing ASD node properties + contract warnings |
| **`nodeTypes` outside component** | `const nodeTypes: NodeTypes = { friend: ... }` defined at module scope | Same — all 7 types registered at module scope |
| **`ReactFlowProvider` wrapper** | Separate wrapper component provides context | Same pattern for hook access outside `<ReactFlow>` |

### Design Inspiration from Production Editors

| Product | What to Learn | What to Avoid |
|---------|---------------|---------------|
| **n8n** | Node categorization by color, clean connection lines, live data preview badges | Overly wide nodes, cramped text, gray-on-gray in dark mode |
| **Langflow** | Dark mode canvas, typed input/output handles with distinct colors | Too many visible handles creating visual noise |
| **Dify** | Clean status indicators, conversation-to-graph mapping | Flat node styling that makes everything look the same |
| **Linear** | Information density without clutter, status badges, keyboard-first UX | N/A — excellent reference overall |
| **Figma** | Canvas zoom/pan UX, selection states, contextual toolbars | N/A — the gold standard for canvas interactions |

---

## 3. Node Type Specifications

### 3.1 Type Registry

All 8 ASD node types, each with a distinct visual identity:

| Type | Shape | Color Token | Icon | Purpose |
|------|-------|-------------|------|---------|
| `StartNode` | Rounded pill | `--node-start` · emerald-500 | `Play` | Workflow entry point |
| `EndNode` | Rounded pill | `--node-end` · slate-400 | `Square` (stop) | Successful completion |
| `ActionNode` | Rounded rectangle | `--node-action` · blue-500 | `Zap` | Tool call / automated action |
| `DecisionNode` | Diamond / rotated square | `--node-decision` · amber-500 | `GitBranch` | Conditional branch (true/false paths) |
| `HandoffNode` | Rectangle with dashed border | `--node-handoff` · violet-500 | `UserCheck` | Human escalation point |
| `WaitNode` | Rounded rectangle with clock accent | `--node-wait` · cyan-500 | `Clock` | Timer or external trigger |
| `ErrorNode` | Rounded rectangle with alert accent | `--node-error` · red-500 | `AlertTriangle` | Failure / unrecoverable state |
| `SkillNode` | Hexagon / rounded hex | `--node-skill` · teal-500 | `Cpu` | Agent capability / API skill binding |

### 3.2 Node Data Contract (TypeScript)

```typescript
// Base node data — all node types extend this
type BaseNodeData = {
  label: string;                          // Display name
  description: string;                    // Detailed description from SOP
  sopReference?: {                        // Link back to source document
    documentId: string;
    sectionId: string;
    excerpt: string;                      // Quoted text from SOP
  };
  confidenceScore: number;                // 0-1 ingestion confidence
  status: 'complete' | 'needs_clarification' | 'automation_gap';
  contracts: ContractOverlay[];           // Active contracts on this node
  executionState?: ExecutionNodeState;    // Only during live execution
};

// Per-type extensions
// NOTE: ActionNode does NOT have its own toolBinding. It references a SkillNode
// by ID. The SkillNode's connector/tool binding is authoritative at execution time.
// ActionNodes without a skillNodeId are internal logic steps (no API call).
type ActionNodeData = BaseNodeData & {
  skillNodeId?: string;                   // Reference to a SkillNode (if this action calls a skill)
  parameters?: Record<string, unknown>;   // Runtime parameters for the skill call
  isInternalLogic?: boolean;              // True if this action doesn't call any external tool
};

type DecisionNodeData = BaseNodeData & {
  condition: string;                      // Human-readable condition
  conditionExpression: string;            // Machine-evaluable expression
  trueBranchLabel: string;
  falseBranchLabel: string;
};

type HandoffNodeData = BaseNodeData & {
  escalationTarget: string;               // Role or person
  escalationChannel: string;              // Slack, email, etc.
  slaMinutes: number;                     // SLA window
  automationGapReason?: string;           // Why this can't be automated
};

type WaitNodeData = BaseNodeData & {
  waitType: 'timer' | 'external_trigger' | 'condition';
  durationMinutes?: number;
  triggerDescription?: string;
};

type SkillNodeData = BaseNodeData & {
  skillDocumentId: string;                // Link to the skill document in knowledge base
  skillDocumentVersion: number;           // Pinned version of the skill doc
  capability: {
    name: string;                         // e.g. "Web Search", "Email Send", "CRM Lookup"
    category: 'search' | 'communication' | 'data' | 'analysis' | 'integration' | 'custom';
    provider: string;                     // e.g. "Google", "Salesforce", "Slack"
    apiEndpoint?: string;                 // The specific API this skill calls
  };
  inputSchema: Record<string, {           // Expected inputs to this skill
    type: string;
    description: string;
    required: boolean;
  }>;
  outputSchema: Record<string, {          // What this skill returns
    type: string;
    description: string;
  }>;
  connectorId: string;                    // Which Connector provides this skill
  toolName: string;                       // Registered tool name in ConnectorRegistry
  rateLimits?: {
    maxCallsPerMinute: number;
    maxCallsPerExecution: number;
  };
  lastSyncedAt: string;                   // When skill doc was last synced to this node
  syncStatus: 'synced' | 'drift' | 'pending';  // Bidirectional sync state
};

// Execution overlay (only present during live runs)
type ExecutionNodeState = {
  phase: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  enteredAt?: string;                     // ISO timestamp
  completedAt?: string;
  contractCheckResults?: Array<{
    contractId: string;
    rule: string;
    result: 'pass' | 'block' | 'escalate';
  }>;
};

// Contract overlay badge
type ContractOverlay = {
  contractId: string;
  contractName: string;
  state: 'draft' | 'active' | 'suspended' | 'archived';
  ruleCount: number;
  ruleTypes: Array<'must_always' | 'must_never' | 'must_escalate'>;
};

// Typed node definitions using @xyflow/react generics
type StartNode     = Node<BaseNodeData, 'start'>;
type EndNode       = Node<BaseNodeData, 'end'>;
type ActionNode    = Node<ActionNodeData, 'action'>;
type DecisionNode  = Node<DecisionNodeData, 'decision'>;
type HandoffNode   = Node<HandoffNodeData, 'handoff'>;
type WaitNode      = Node<WaitNodeData, 'wait'>;
type ErrorNode     = Node<BaseNodeData, 'error'>;
type SkillNode     = Node<SkillNodeData, 'skill'>;

type ASDNode = StartNode | EndNode | ActionNode | DecisionNode
             | HandoffNode | WaitNode | ErrorNode | SkillNode;
```

### 3.3 Node Visual States

Each node must render distinctly across these states (layered, not exclusive):

| State | Visual Treatment |
|-------|-----------------|
| **Default** | Base type color at ~15% opacity background, colored left-border accent (3px), white/dark text |
| **Hovered** | Subtle elevation increase (`box-shadow` shift), handle dots appear at connection points |
| **Selected** | Ring outline in type color (`box-shadow: 0 0 0 2px var(--node-color)`), inspector panel opens |
| **Executing (active)** | Pulsing glow animation on border, filled progress indicator, type color at 30% opacity |
| **Executing (completed)** | Subtle checkmark badge, muted color (reduce saturation 40%) |
| **Executing (failed)** | Red border override, alert icon badge |
| **Contract violation** | Red pulsing dot in top-right corner, violation count badge |
| **Needs clarification** | Amber dashed border, question mark badge |
| **Automation gap** | Violet dashed border, handoff icon, "gap" label |
| **Drift warning** | Orange triangle badge in top-left corner |

---

## 4. Edge Type Specifications

### 4.1 Edge Visual Differentiation Matrix

Every edge type must be instantly distinguishable at a glance — by path style, color,
dash pattern, arrowhead marker, and optional animation. In a 50+ edge graph, users
should never need to read a label to understand an edge's purpose.

| Type | Path Style | Stroke Color | Width | Dash Pattern | Marker (Arrow) | Label |
|------|-----------|-------------|-------|-------------|----------------|-------|
| `default` | `smoothstep` | slate-500 | 1.5px | Solid | Filled triangle arrowhead | None |
| `decision-true` | `bezier` (curve bias right) | emerald-500 | 2px | Solid | Filled circle arrowhead | "Yes" in emerald pill badge |
| `decision-false` | `bezier` (curve bias left) | red-400 | 2px | `8 4` dash | Open triangle arrowhead | "No" in red pill badge |
| `error` | `straight` | red-500 | 1px | `3 3` dotted | X-mark terminal | None |
| `handoff` | `smoothstep` | violet-500 | 2px | `12 6` long dash | Person silhouette marker | Escalation target name |
| `skill-binding` | `bezier` | teal-500 | 1.5px | `4 2 1 2` dash-dot | Hexagon marker | Skill name |

**Execution overlay states** (applied on top of base styles during live runs):

| Overlay State | Visual Treatment |
|---------------|-----------------|
| `execution-active` | Inherits base + animated `stroke-dashoffset` (moving dots toward target), +1px width, glow effect |
| `execution-taken` | Indigo-500 override, 2.5px solid, fade-in glow trail (1s), traversal timestamp label |
| `execution-not-taken` | Inherits base at 20% opacity, 1px, no marker |

### 4.2 Custom SVG Markers

Define custom arrowhead markers in a `<defs>` block at the React Flow root. Each edge
type uses a distinct marker shape for instant visual identification:

| Marker | Used By | Shape |
|--------|---------|-------|
| `arrow-filled` | `default` | Solid triangle pointing in flow direction |
| `arrow-circle` | `decision-true` | Filled circle at target end |
| `arrow-open` | `decision-false` | Open/hollow triangle |
| `arrow-x` | `error` | X-mark at terminal end |
| `arrow-person` | `handoff` | Person silhouette |
| `arrow-hex` | `skill-binding` | Small hexagon at target |

### 4.3 Edge Data Contract

```typescript
type ASDEdgeData = {
  edgeType: 'default' | 'decision-true' | 'decision-false'
          | 'error' | 'handoff' | 'skill-binding';
  label?: string;                         // Condition label for decision branches
  contractDensity?: number;               // Number of active contracts on this transition
                                          // (varies edge width: 0 = 1.5px, 3+ = 3px)
  executionState?: {
    phase: 'pending' | 'active' | 'taken' | 'not-taken';
    traversedAt?: string;                 // ISO timestamp
  };
};

type ASDEdge = Edge<ASDEdgeData>;
```

### 4.4 Edge Interaction

All custom edge components must include an **invisible wide hitbox** (transparent
20px stroke path behind the visible edge) for click targeting, following the Yumi
`SimilarityEdge` pattern. Without this, 1.5px edges are nearly impossible to click.

### 4.5 Parallel Edge Routing

When a DecisionNode has both true and false edges going to the same target node
(reconvergence), use React Flow's `pathOptions.offset` to visually separate the
parallel paths. Alternatively, assign different `sourceHandle` / `targetHandle`
positions to force spatial separation.

### 4.6 Contract Density on Edges

Edge width encodes the number of active contracts governing the transition between
two nodes. This gives compliance officers an at-a-glance view of where governance
is concentrated:

| Active Contracts | Stroke Width |
|------------------|-------------|
| 0 | 1.5px (base) |
| 1–2 | 2px |
| 3+ | 3px |

### 4.7 Animated Execution Flow

During live execution, the active edge shows animated dashes flowing toward the
target. Use CSS `stroke-dasharray` + `stroke-dashoffset` animation with a constant
animation speed (not proportional to edge length) so longer edges show faster-moving
dashes, creating a sense of progress.

Edges that have been traversed show a brief "glow trail" — a wider, semi-transparent
stroke that fades over 1 second — before settling into the `taken` visual state.

```css
@keyframes edge-flow {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
}

.edge-active path {
  stroke-dasharray: 6 3;
  animation: edge-flow 0.6s linear infinite;
}

.edge-taken path {
  filter: drop-shadow(0 0 4px var(--execution-glow));
  transition: filter 1s ease-out;
}
```

---

## 5. API Contract (Next.js ↔ FastAPI)

The frontend **never** talks to the database directly. All data flows through
FastAPI endpoints. This section defines the REST boundary.

### 5.1 Tech Stack Data Flow

```
Next.js (App Router)  →  FastAPI (Python)  →  Database (Postgres)
  ├─ Server Components       ├─ AI ingestion        ├─ Versioned ASDs
  ├─ Client Components       ├─ Contract enforcement ├─ Contracts
  ├─ React Flow graph        ├─ Execution engine     ├─ Execution logs
  └─ TanStack Query cache    └─ Skill KB CRUD        └─ Skill documents
```

### 5.2 REST Endpoints

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `GET` | `/api/asds/{id}` | — | `ASDResponse` | Fetch ASD with contracts + drift info |
| `GET` | `/api/asds/{id}/versions` | — | `ASDVersion[]` | Version history for diff view |
| `POST` | `/api/asds/{id}/mutations` | `MutationRequest` | `MutationResponse` | Batch graph edits (atomic) |
| `GET` | `/api/asds/{id}/positions` | — | `PositionMap` | Node positions (cosmetic, separate from ASD version) |
| `PUT` | `/api/asds/{id}/positions` | `PositionMap` | `204` | Save dragged positions (debounced, no new ASD version) |
| `GET` | `/api/executions/{id}/stream` | — | `SSE stream` | Live execution events |
| `GET` | `/api/executions/{id}` | — | `ExecutionSummary` | Completed execution summary |
| `GET` | `/api/skills` | `?category=&search=` | `SkillDocument[]` | Browse skill knowledge base |
| `POST` | `/api/skills` | `SkillDocument` | `SkillDocument` | Create skill document |
| `PUT` | `/api/skills/{id}` | `Partial<SkillDocument>` | `SkillDocument` | Update skill document (bidirectional sync) |
| `POST` | `/api/skills/import` | `OpenAPISpec \| file` | `SkillDocument[]` | Import skills from API spec |
| `GET` | `/api/asds/{id}/presence` | — | `PresenceInfo[]` | Who is currently editing this ASD |

### 5.3 Error Response Envelope

Every endpoint returns errors in a consistent shape:

```typescript
type APIError = {
  error: {
    code: 'VERSION_CONFLICT' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR'
        | 'NOT_FOUND' | 'CONTRACT_VIOLATION' | 'SERVER_ERROR';
    message: string;                      // Human-readable
    details?: Record<string, unknown>;    // Machine-readable context
    requestId: string;                    // For support debugging
  };
};

// HTTP status mapping:
// 409 Conflict      → VERSION_CONFLICT (optimistic concurrency failure)
// 403 Forbidden     → PERMISSION_DENIED
// 422 Unprocessable → VALIDATION_ERROR (invalid graph structure)
// 404 Not Found     → NOT_FOUND
// 500 Internal      → SERVER_ERROR
```

### 5.4 ASD Fetch Response Schema

```typescript
type ASDResponse = {
  asd: {
    id: string;
    version: number;
    sopId: string;
    sopName: string;
    sopVersionHash: string;
    createdAt: string;
    updatedAt: string;
    automationCoverageScore: number;       // 0-1
    nodes: ASDNode[];
    edges: ASDEdge[];
  };
  contracts: Contract[];                    // All contracts scoped to this ASD
  driftDetected: boolean;                   // Source SOP changed since last compile
  driftDetails?: {
    sopLastModified: string;
    affectedNodeIds: string[];
  };
  currentEditors?: PresenceInfo[];          // Users currently editing
};
```

### 5.5 Execution Stream Protocol (SSE)

SSE (Server-Sent Events) is the transport for live execution events. SSE is chosen
over WebSocket because the stream is **unidirectional** (server → client), the graph
is read-only during execution, and SSE auto-reconnects natively.

**Endpoint**: `GET /api/executions/{id}/stream`

**Wire format** (newline-delimited SSE):
```
event: node_entered
data: {"nodeId": "n1", "timestamp": "2026-03-28T10:00:01Z"}

event: contract_check
data: {"nodeId": "n1", "contractId": "c1", "rule": "must_always_log", "result": "pass", "timestamp": "2026-03-28T10:00:02Z"}

event: node_completed
data: {"nodeId": "n1", "timestamp": "2026-03-28T10:00:03Z"}
```

**Reconnection**: On disconnect, the client sends `Last-Event-ID` header. The
backend buffers the last 100 events per execution and replays missed events on
reconnect. The client shows a "Reconnecting..." banner during disconnection.

**Client-side batching**: Events may arrive faster than 60fps. The `useExecutionStream`
hook batches events within a 16ms window (aligned to `requestAnimationFrame`) and
applies them as a single Zustand store update to prevent render thrashing.

```typescript
type ExecutionEvent =
  | { type: 'node_entered'; nodeId: string; timestamp: string }
  | { type: 'node_completed'; nodeId: string; timestamp: string }
  | { type: 'node_failed'; nodeId: string; error: string; timestamp: string }
  | { type: 'tool_call_attempted'; nodeId: string; tool: string; timestamp: string }
  | { type: 'contract_check'; nodeId: string; contractId: string;
      rule: string; result: 'pass' | 'block' | 'escalate'; timestamp: string }
  | { type: 'violation'; nodeId: string; contractId: string;
      rule: string; action: string; timestamp: string }
  | { type: 'handoff_requested'; nodeId: string; target: string; timestamp: string }
  | { type: 'handoff_resolved'; nodeId: string; response: string; timestamp: string }
  | { type: 'execution_completed'; timestamp: string }
  | { type: 'execution_failed'; error: string; timestamp: string };
```

---

## 6. Output Contract (Graph → FastAPI)

### 6.1 Mutation Request (Batched, Atomic)

All graph edits are sent as a **batch** to a single endpoint. This prevents partial
failures from creating inconsistent state (e.g., deleting a node but not its edges).

```typescript
type MutationRequest = {
  asdId: string;
  expectedVersion: number;                // Optimistic concurrency control
  mutations: GraphMutation[];             // Applied atomically as one transaction
};

type GraphMutation =
  | { type: 'add_node'; node: Omit<ASDNode, 'id'>; position: { x: number; y: number } }
  | { type: 'remove_node'; nodeId: string }
  | { type: 'update_node'; nodeId: string;
      changes: Partial<BaseNodeData & ActionNodeData & DecisionNodeData
                       & HandoffNodeData & WaitNodeData & SkillNodeData> }
  | { type: 'add_edge'; edge: Omit<ASDEdge, 'id'> }
  | { type: 'remove_edge'; edgeId: string }
  | { type: 'reorder_edges'; nodeId: string; edgeIds: string[] };

// Note: move_node is NOT a mutation — positions are cosmetic and saved
// separately via PUT /api/asds/{id}/positions (no new ASD version).
```

### 6.2 Mutation Response

```typescript
type MutationResponse = {
  newVersion: number;
  asd: ASDResponse['asd'];
  contractWarnings: Array<{
    contractId: string;
    contractName: string;
    message: string;                      // "This node is referenced by 3 active contracts"
    severity: 'info' | 'warning' | 'critical';
  }>;
  suggestedContracts?: Contract[];        // Auto-derived contract suggestions from edit
};
```

### 6.3 Version Conflict Resolution

When `expectedVersion` does not match `currentVersion`, the server returns `409 Conflict`:

```typescript
// 409 response body
type VersionConflict = APIError & {
  error: {
    code: 'VERSION_CONFLICT';
    details: {
      expectedVersion: number;
      currentVersion: number;
      conflictingEditor?: string;         // Username of the other editor
      changedSince: string;               // ISO timestamp of the conflicting version
    };
  };
};
```

**Frontend resolution flow**:
1. Show modal with message: "This ASD was updated by [user] at [time]"
2. Offer three options:
   - **Reload & re-apply**: Fetch latest version, attempt to re-apply the user's mutations
   - **Force overwrite**: Submit with `forceOverwrite: true` (creates audit trail entry)
   - **Discard**: Abandon local changes, reload latest version

### 6.4 Undo/Redo Architecture

Undo/redo operates on the **local Zustand store** as a stack of graph snapshots.
Mutations are batched and sent to the server on explicit **Save** (or auto-save
with 3-second debounce after last edit). This gives clean undo semantics without
server-side version proliferation.

- Undo stack depth: 50 snapshots max
- Redo stack clears on any new edit
- `isDirty` flag in store indicates unsaved local changes
- Toolbar shows "Unsaved changes" indicator when `isDirty === true`

---

## 6A. Authentication & Authorization

### Roles

| Role | View | Edit Nodes | Edit Edges | Delete | Activate Contracts | Trigger Execution |
|------|------|-----------|-----------|--------|-------------------|------------------|
| `viewer` | Yes | No | No | No | No | No |
| `editor` | Yes | Yes | Yes | Yes | No | No |
| `admin` | Yes | Yes | Yes | Yes | Yes | Yes |
| `compliance` | Yes | No | No | No | Yes | No |

### Implementation

- Every API call includes `Authorization: Bearer <token>` header
- FastAPI validates token and extracts user role
- Frontend queries user role on load and sets graph mode accordingly:
  - `viewer` / `compliance` → read-only mode
  - `editor` / `admin` → edit mode available
- Mutations from unauthorized roles return `403 PERMISSION_DENIED`

### Presence Indicator

When a user enters edit mode on an ASD, FastAPI records this. Other users see
"Currently being edited by [username]" in the toolbar. This is a lightweight
conflict-avoidance signal, not real-time collaborative editing.

---

## 6B. Error Handling & Recovery

### Error State Visual Treatments

| Error | Visual | Recovery |
|-------|--------|----------|
| **Network error** | Toast notification + "Retry" button. Toolbar shows disconnected icon. | Manual retry or auto-retry after 5s. |
| **Version conflict (409)** | Modal with diff: what changed, by whom. Merge/overwrite/discard options. | User chooses resolution strategy. |
| **Permission denied (403)** | Toast: "You don't have permission." Auto-downgrade to read-only mode. | Contact admin for role upgrade. |
| **Validation error (422)** | Inline error on the offending node/edge. Red outline + error message. | User fixes the validation issue. |
| **Server error (500)** | Toast with error ID for support. Graph remains in last-known-good state. | Retry or reload. |
| **SSE disconnect** | "Reconnecting..." banner at top. Auto-reconnect with exponential backoff. | On reconnect, re-fetch full execution state to catch missed events. |

### Optimistic Updates

The frontend uses TanStack Query for data fetching with optimistic mutations:
1. User edits a node → Zustand store updates immediately (optimistic)
2. Mutation sent to FastAPI
3. On success: TanStack Query cache updated with server response
4. On failure: Zustand store rolls back to pre-edit state, error toast shown

### Data Fetching Strategy

| Use Case | Tool | `staleTime` | Notes |
|----------|------|-------------|-------|
| ASD fetch | TanStack Query `useQuery` | 30s (edit), 5s (execution) | Automatic refetch on window focus |
| Graph mutations | TanStack Query `useMutation` | — | Optimistic updates with rollback |
| Execution events | SSE + Zustand | — | Events update store directly, not query cache |
| Skill KB browse | TanStack Query `useQuery` | 60s | Lower priority, less volatile |
| Presence info | Polling (10s interval) | 0 | Always fresh |

---

## 7. Component Architecture

```
components/graph/
├── ASDGraphProvider.tsx          # ReactFlowProvider + Zustand store + data fetching
├── ASDGraph.tsx                  # Main <ReactFlow> canvas (controlled mode)
├── nodes/
│   ├── types.ts                  # All node type definitions
│   ├── BaseNode.tsx              # Shared node shell (border, badges, handles, states)
│   ├── StartNode.tsx             # Pill shape, play icon
│   ├── EndNode.tsx               # Pill shape, stop icon
│   ├── ActionNode.tsx            # Rounded rect, tool binding display
│   ├── DecisionNode.tsx          # Diamond, condition text, true/false labels
│   ├── HandoffNode.tsx           # Dashed border, escalation target + SLA
│   ├── WaitNode.tsx              # Clock accent, timer/trigger display
│   ├── ErrorNode.tsx             # Alert accent, failure info
│   └── SkillNode.tsx             # Hexagon, API binding, input/output schema, sync badge
├── edges/
│   ├── types.ts                  # Edge type definitions
│   ├── FlowEdge.tsx              # Default smoothstep edge with filled arrow marker
│   ├── DecisionTrueEdge.tsx      # Emerald bezier, circle marker, "Yes" pill label
│   ├── DecisionFalseEdge.tsx     # Red dashed bezier, open arrow, "No" pill label
│   ├── ErrorEdge.tsx             # Dotted straight, X-mark terminal
│   ├── HandoffEdge.tsx           # Long-dash violet, person marker
│   ├── SkillBindingEdge.tsx      # Dash-dot teal, hexagon marker, skill name label
│   └── EdgeMarkerDefs.tsx        # SVG <defs> block for all custom arrowhead markers
├── overlays/
│   ├── ContractBadge.tsx         # Small badge showing contract count + state
│   ├── ExecutionPulse.tsx        # Animated glow for active node
│   ├── DriftWarning.tsx          # Orange triangle for stale ASD nodes
│   ├── ViolationDot.tsx          # Red pulsing dot for contract violations
│   └── ClarificationMark.tsx    # Amber question mark for unresolved nodes
├── panels/
│   ├── NodeInspector.tsx         # Right panel: edit node properties
│   ├── ContractOverlay.tsx       # Contract details for selected node
│   ├── ExecutionTimeline.tsx     # Bottom panel: event stream during live run
│   └── CoverageBar.tsx           # Top bar: automation coverage score
├── toolbar/
│   ├── GraphToolbar.tsx          # Top toolbar: zoom, layout, mode toggle
│   ├── NodePalette.tsx           # Left sidebar: drag-and-drop node types
│   └── ViewModeToggle.tsx        # Switch: edit mode / execution mode / read-only
├── hooks/
│   ├── useASDData.ts             # Fetch + cache ASD from database
│   ├── useASDMutations.ts        # Write node/edge edits back to database
│   ├── useExecutionStream.ts     # Subscribe to live execution events (SSE/WS)
│   ├── useGraphLayout.ts         # Dagre layout computation
│   ├── useContractOverlays.ts    # Map contracts to node badges
│   ├── useGraphKeyboard.ts       # Keyboard shortcuts (delete, undo, zoom)
│   ├── useSkillDocSync.ts        # Bidirectional sync: skill node ↔ skill document
│   └── useSkillKnowledgeBase.ts  # CRUD for skill document knowledge base
├── store/
│   └── graphStore.ts             # Zustand store: nodes, edges, selection, mode
└── styles/
    ├── graph.css                 # React Flow overrides, CSS variables
    └── nodes.css                 # Node type-specific styles
```

---

## 8. Interaction Requirements

### 8.1 Modes

| Mode | Behavior |
|------|----------|
| **Edit** | Full CRUD on nodes/edges. Drag-and-drop from palette. Click node → inspector panel. Delete key removes selected. |
| **Execution** | Read-only graph. Live highlighting of active node. Animated edge traversal. Event timeline at bottom. |
| **Read-only** | No editing, no live data. Pure visualization for compliance review or embedding in reports. |

### 8.2 Core Interactions

| Action | Input | Result |
|--------|-------|--------|
| Select node | Click | Highlight node, open inspector panel, show linked contracts |
| Multi-select | Shift+click or drag selection box | Bulk operations (delete, move) |
| Add node | Drag from palette | New node at drop position, type selected from palette |
| Connect nodes | Drag from source handle to target handle | New edge created, validates DAG (no cycles) |
| Delete | Backspace/Delete key on selected | Remove with confirmation if contracts are linked |
| Pan | Click+drag on canvas, or Space+drag | Move viewport |
| Zoom | Scroll wheel, pinch, or `+`/`-` keys | Zoom in/out (0.25 - 2.0 range) |
| Fit view | `Cmd+0` or toolbar button | Zoom to fit all nodes with padding |
| Auto-layout | Toolbar button | Re-run dagre layout (top-to-bottom) |
| Undo/Redo | `Cmd+Z` / `Cmd+Shift+Z` | Revert/reapply last graph mutation |
| Search nodes | `Cmd+F` | Filter/highlight nodes by label text |

### 8.3 Validation Rules

- **No cycles**: The graph is a DAG. Reject any edge that would create a cycle.
- **Single start**: Exactly one `StartNode` per ASD.
- **Reachability**: Every node must be reachable from `StartNode`. Warn on orphans.
- **Decision completeness**: Every `DecisionNode` must have exactly one `decision-true` and one `decision-false` outgoing edge.
- **Terminal coverage**: Every leaf path must end at `EndNode` or `ErrorNode`.
- **Contract impact**: Warn before deleting/editing nodes that have active contracts.

---

## 9. Layout Strategy

### Primary: Dagre (Left-to-Right Flow)

The graph flows **left to right** — matching the mental model of a pipeline:
Input → Agent Processing → Skills → Output. This is a core UX decision.

```typescript
// Layout configuration
const LAYOUT_CONFIG = {
  rankdir: 'LR',           // LEFT-TO-RIGHT flow direction
  nodesep: 60,             // Horizontal spacing between nodes
  ranksep: 100,            // Vertical spacing between ranks
  edgesep: 20,             // Edge spacing
  marginx: 40,
  marginy: 40,
};

// Node dimensions by type (dagre needs these)
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  start:    { width: 160, height: 48 },
  end:      { width: 160, height: 48 },
  action:   { width: 240, height: 80 },
  decision: { width: 200, height: 100 },   // Diamond needs more height
  handoff:  { width: 240, height: 96 },
  wait:     { width: 200, height: 72 },
  error:    { width: 200, height: 72 },
  skill:    { width: 220, height: 88 },
};
```

### When to Re-layout

- On initial ASD load
- When user clicks "Auto Layout" button
- When nodes are added/removed (with option to skip)
- Never during live execution (positions are frozen)

### User Position Overrides

- User-dragged positions are persisted per ASD version
- Auto-layout respects pinned nodes (user can pin/unpin)
- `fitView({ padding: 0.15, duration: 600 })` after every layout change

---

## 10. Styling Specification

### 10.1 CSS Variables — Sand Palette

The design uses a warm, light sand palette inspired by natural earth tones.
Five base hexes: `#EDEDE9`, `#D6CCC2`, `#F5EBE0`, `#E3D5CA`, `#D5BDAF`.

```css
:root {
  /* Canvas */
  --graph-bg: #EDEDE9;                    /* sand-100 — page background */
  --graph-grid-color: #D6CCC2;            /* sand-300 — dot grid */
  --graph-selection-bg: rgba(213, 189, 175, 0.15);

  /* Sand scale */
  --sand-50: #F5EBE0;                     /* cream — inputs, modals, elevated surfaces */
  --sand-100: #EDEDE9;                    /* warm gray — page background */
  --sand-200: #E3D5CA;                    /* light sand — cards, panels (tertiary) */
  --sand-300: #D6CCC2;                    /* warm stone — borders, hover (secondary) */
  --sand-400: #D5BDAF;                    /* rosy taupe — accent, buttons (primary) */
  --sand-500: #C4A98E;                    /* deeper taupe — active/pressed states */
  --sand-600: #A68B6B;                    /* dark taupe — strong text accents */
  --sand-700: #7C6854;                    /* earth — headings, high-contrast text */
  --sand-800: #5C4D3C;                    /* deep earth — primary text */
  --sand-900: #3D3228;                    /* near-black — max contrast text */

  /* Node base */
  --node-bg: var(--sand-50);
  --node-border: var(--sand-300);
  --node-text: var(--sand-900);
  --node-text-secondary: var(--sand-700);
  --node-radius: 12px;
  --node-shadow: 0 1px 4px rgba(61, 50, 40, 0.06);
  --node-shadow-hover: 0 4px 16px rgba(61, 50, 40, 0.10);

  /* Node type colors — warm-shifted to harmonize with sand */
  --node-start: #6B8E6B;        /* sage green */
  --node-end: #A68B6B;          /* warm stone (sand-600) */
  --node-action: #8B7355;       /* warm brown */
  --node-decision: #C49A6C;     /* golden sand */
  --node-handoff: #9E8B9E;      /* muted mauve */
  --node-wait: #7EA3A3;         /* dusty teal */
  --node-error: #B86B6B;        /* muted terra cotta */
  --node-skill: #7A9E8E;        /* sage teal */

  /* Edges */
  --edge-default: var(--sand-300);
  --edge-width: 1.5px;
  --edge-hover-width: 2.5px;

  /* Overlays */
  --violation-pulse: #B86B6B;
  --drift-warning: #C49A6C;
  --clarification-mark: #C49A6C;
  --execution-glow: var(--sand-400);

  /* Panel */
  --panel-bg: var(--sand-50);
  --panel-border: var(--sand-300);
}
```

### 10.2 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Node label | Geist Sans | 14px | 500 |
| Node description (in inspector) | Geist Sans | 13px | 400 |
| Edge label | Geist Sans | 11px | 500 |
| Badge text | Geist Mono | 10px | 600 |
| Contract rule text | Geist Mono | 12px | 400 |
| Toolbar text | Geist Sans | 12px | 500 |
| Panel header | Geist Sans | 16px | 600 |

### 10.3 Node Component Styling Pattern

```css
/* Base node shell — all types inherit */
.asd-node {
  background: var(--sand-50);
  border: 1px solid var(--sand-300);
  border-left: 3px solid var(--node-type-color);
  border-radius: var(--node-radius);
  box-shadow: var(--node-shadow);
  padding: 12px 16px;
  min-width: 180px;
  transition: all 0.2s cubic-bezier(0.17, 0.67, 0.27, 1);
  cursor: pointer;
}

.asd-node:hover {
  box-shadow: var(--node-shadow-hover);
  border-color: var(--sand-400);
}

.asd-node.selected {
  box-shadow: 0 0 0 2px var(--node-type-color), var(--node-shadow-hover);
}

/* Type-specific overrides */
.asd-node[data-type="start"],
.asd-node[data-type="end"] {
  border-radius: 24px;          /* Pill shape */
  text-align: center;
  min-width: 140px;
  border-left-width: 1px;       /* No left accent on pills */
  border-color: var(--node-type-color);
}

.asd-node[data-type="decision"] {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);  /* Diamond via clip-path — no rotation artifacts */
  border-left-width: 1px;
  border-color: var(--node-type-color);
  padding: 24px 32px;          /* Extra padding to keep content visible inside diamond */
  text-align: center;
}

.asd-node[data-type="handoff"] {
  border-style: dashed;
}

/* Execution states */
.asd-node[data-execution="active"] {
  animation: execution-pulse 2s ease-in-out infinite;
}

@keyframes execution-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(213, 189, 175, 0.4); }
  50%      { box-shadow: 0 0 0 8px rgba(213, 189, 175, 0); }
}

.asd-node[data-execution="completed"] {
  opacity: 0.7;
}

.asd-node[data-execution="failed"] {
  border-color: var(--node-error) !important;
  box-shadow: 0 0 0 1px var(--node-error);
}
```

### 10.4 Background Configuration

```tsx
<Background
  variant={BackgroundVariant.Dots}
  gap={20}
  size={1}
  color="#D6CCC2"     /* sand-300 — subtle warm dots */
/>
// Canvas background set via CSS: .react-flow__background { background: #EDEDE9; }
```

---

## 11. Performance Requirements

| Metric | Target |
|--------|--------|
| Initial render (50 nodes) | < 200ms |
| Initial render (200 nodes) | < 500ms |
| Node drag frame rate | 60fps consistent |
| Zoom/pan frame rate | 60fps consistent |
| Layout computation (100 nodes) | < 100ms |
| Execution event → visual update | < 50ms |
| Memory (200 nodes, 400 edges) | < 80MB heap |

### Performance Techniques (Required)

1. **`React.memo()` on all node and edge components** — prevent re-renders of unaffected nodes
2. **`nodeTypes` and `edgeTypes` defined outside components** — stable references
3. **`useReactFlow()` for imperative reads** — no subscription re-renders
4. **Zustand store with selectors** — fine-grained subscriptions, not full-tree re-renders
5. **`onlyRenderVisibleElements`** — enable viewport virtualization for ASDs with > 100 nodes
6. **Debounced layout** — re-layout on idle, not on every mutation
7. **CSS transitions over JS animations** — GPU-accelerated state changes

---

## 12. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Tab between nodes, Enter to select, arrow keys to move |
| Screen reader support | `aria-label` on nodes with type + label + state |
| Color-blind safe | Node types distinguished by shape + icon, not only color |
| Focus indicators | Visible focus ring on keyboard navigation |
| Reduced motion | Respect `prefers-reduced-motion` — disable execution pulse, edge animations |
| Zoom | Minimum 0.25x, maximum 4x for low-vision users |

---

## 13. Quality Checklist

Before shipping any React Flow graph iteration:

- [ ] All 8 node types render correctly with distinct visual identity
- [ ] Node states (hover, selected, executing, violation, drift) layer correctly
- [ ] Edges connect correctly with no visual overlap on parallel paths
- [ ] Decision nodes produce exactly 2 labeled outgoing edges
- [ ] Contract badges render on nodes with active contracts
- [ ] Inspector panel opens on node click with correct data
- [ ] Edit → save → reload roundtrip preserves all node data
- [ ] Live execution mode highlights active node and animates edge traversal
- [ ] Violation events surface red dot + count badge in < 50ms
- [ ] Dagre layout produces readable top-to-bottom DAG
- [ ] `fitView` works on initial load and after layout
- [ ] Dark mode and light mode both render correctly
- [ ] No orphan nodes (validation warning shown)
- [ ] Cycle prevention on edge creation
- [ ] Undo/redo works for all mutations
- [ ] Zoom/pan smooth at 60fps with 100+ nodes
- [ ] `memo()` on all custom node/edge components
- [ ] No `nodeTypes` or `edgeTypes` defined inside render functions

---

## 14. Implementation Phases

### Phase 1 — Static Rendering
- Render an ASD from database as a read-only graph
- All 8 node types with correct shapes, colors, icons (including SkillNode)
- Dagre auto-layout
- Dark mode canvas with dot grid background
- `fitView` on load
- Node click → inspector panel (read-only)

### Phase 2a — Core Editing
- Node CRUD (add from palette, delete, edit properties in inspector)
- Edge CRUD (connect handles, delete, type assignment)
- Zustand store for controlled state with undo/redo stack
- Batch mutations to FastAPI with optimistic updates
- Optimistic concurrency (expectedVersion) + conflict resolution modal
- Contract impact warnings on edit
- Validation (no cycles, reachability, decision completeness)
- RBAC enforcement (mode based on user role)
- Presence indicator ("Currently edited by...")
- Error handling (toast, rollback, retry)

### Phase 2b — Skill System (can parallel with Phase 3)
- SkillNode type rendering with hex accent + schema display
- Skill Knowledge Base sidebar panel (browse, search, filter by category)
- Drag skill from KB panel onto canvas → creates SkillNode
- Bidirectional sync (edit SkillNode → update KB doc, KB doc change → drift badge)
- Skill document import from OpenAPI specs
- Connector scan to discover available tools as skills
- ActionNode → SkillNode reference binding

### Phase 3 — Live Execution
- **Prerequisite**: FastAPI execution stream endpoint (SSE) deployed
- **For frontend dev**: Mock SSE server replaying recorded execution event sequences
- SSE subscription via `useExecutionStream` hook with 16ms event batching
- Active node highlighting with pulse animation
- Edge traversal animation (animated `stroke-dashoffset` dash flow)
- Edge glow trail for traversed paths
- Execution timeline panel (bottom)
- Violation/stuck state overlays
- Read-only mode enforcement during execution
- SSE disconnect → "Reconnecting..." banner with exponential backoff

### Phase 4 — Polish & Scale
- Keyboard shortcuts
- Node search (`Cmd+F`)
- Minimap with type-colored node indicators
- Viewport virtualization for large ASDs
- Accessibility audit
- Performance profiling and optimization pass
- Light mode refinement

---

## 15. Skill Nodes & Bidirectional Skill Document System

### 15.1 Concept

Every agent has **capabilities** — web search, email sending, CRM lookups, Slack
messaging, etc. These capabilities are documented as **Skill Documents** in a
knowledge base and represented visually as **SkillNodes** on the graph. The
relationship is **bidirectional**:

```
┌──────────────────┐          ┌──────────────────┐
│  Skill Document  │  ←sync→  │   Skill Node     │
│  (Knowledge Base)│          │   (React Flow)   │
└──────────────────┘          └──────────────────┘
        ↑                              ↑
        │ ingest                       │ drag-and-drop
        ↓                              ↓
┌──────────────────┐          ┌──────────────────┐
│  API Spec / Docs │          │  ASD Graph       │
│  (OpenAPI, etc.) │          │  (Workflow)       │
└──────────────────┘          └──────────────────┘
```

- **Ingest direction**: Import an API spec or skill document → system creates
  a Skill Document in the knowledge base → auto-generates a SkillNode that
  can be placed on any ASD graph
- **Edit direction**: Edit a SkillNode on the graph (change parameters, rename,
  update schema) → changes propagate back to the Skill Document in the
  knowledge base
- **Sync state**: Each SkillNode tracks `syncStatus` — `synced`, `drift`
  (knowledge base changed but node not updated), or `pending` (node changed
  but not yet written back)

### 15.2 Skill Document Schema

```typescript
type SkillDocument = {
  id: string;
  version: number;
  name: string;                           // "Web Search", "Send Email", "Salesforce Query"
  description: string;                    // What this skill does
  category: 'search' | 'communication' | 'data' | 'analysis' | 'integration' | 'custom';
  provider: string;                       // "Google", "Salesforce", "Slack"

  // API binding
  connector: {
    connectorId: string;
    toolName: string;                     // Registered tool in ConnectorRegistry
    apiEndpoint?: string;                 // Underlying API endpoint
    authMethod: 'oauth2' | 'api_key' | 'bearer' | 'none';
  };

  // Schema
  inputSchema: Record<string, {
    type: string;                         // "string", "number", "boolean", "object", "array"
    description: string;
    required: boolean;
    default?: unknown;
    enum?: string[];                      // Allowed values
  }>;
  outputSchema: Record<string, {
    type: string;
    description: string;
  }>;

  // Constraints
  rateLimits?: {
    maxCallsPerMinute: number;
    maxCallsPerExecution: number;
  };
  timeout?: number;                       // Max execution time in ms
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };

  // Provenance
  sourceType: 'openapi_import' | 'manual' | 'auto_derived' | 'connector_scan';
  sourceReference?: string;               // URL or file path of imported spec
  createdAt: string;
  updatedAt: string;

  // Usage tracking
  usedInASDs: Array<{                     // Which ASDs reference this skill
    asdId: string;
    asdName: string;
    nodeId: string;
  }>;
};
```

### 15.3 Skill Knowledge Base

The knowledge base is a searchable, categorized library of all available skills.

**Storage**: Parallel Agent Database (same as ASDs and contracts)

**Access patterns**:
- Browse by category (search, communication, data, etc.)
- Search by name or provider
- Filter by connector (show all Salesforce skills, all Slack skills)
- View usage (which ASDs use this skill, how often executed)

**UI**: Left sidebar panel in the graph editor, similar to the Node Palette but
specifically for skills:

```
┌──────────────────────────────────┐
│  🔍 Search skills...             │
├──────────────────────────────────┤
│  ▸ Search (3)                    │
│    ○ Web Search          Google  │
│    ○ Knowledge Retrieval RAG     │
│    ○ Document Search     Internal│
│  ▸ Communication (4)             │
│    ○ Send Email          Gmail   │
│    ○ Send Slack Message  Slack   │
│    ○ Create Jira Ticket  Jira   │
│    ○ SMS Notification    Twilio  │
│  ▸ Data (2)                      │
│    ○ CRM Lookup          SFDC   │
│    ○ DB Query            Neon   │
│  ▸ Integration (1)               │
│    ○ Webhook Call        Custom  │
├──────────────────────────────────┤
│  + Import Skill Document         │
│  + Scan Connector for Skills     │
└──────────────────────────────────┘
```

**Drag-and-drop**: Drag a skill from the knowledge base panel onto the canvas
→ creates a SkillNode pre-populated with the skill document's data.

### 15.4 Ingestion → SkillNode Flow

```
1. User imports skill document (OpenAPI spec, manual entry, or connector scan)
   ↓
2. System parses and creates SkillDocument in knowledge base
   ↓
3. Skill appears in the Knowledge Base sidebar panel
   ↓
4. User drags skill onto an ASD graph
   ↓
5. System creates a SkillNode with:
   - skillDocumentId pointing to the knowledge base entry
   - inputSchema / outputSchema copied from the skill document
   - connectorId / toolName bound to the correct connector
   ↓
6. ActionNodes in the ASD can connect TO a SkillNode
   (meaning: "this action step uses this skill")
   ↓
7. At execution time, the harness resolves SkillNode → Connector → API call
```

### 15.5 Bidirectional Sync Rules

| Change Origin | Propagation | User Confirmation |
|---------------|-------------|-------------------|
| Edit SkillNode on graph (rename, change params) | Auto-sync to skill document in KB | No — immediate write-through |
| Edit skill document in KB directly | SkillNode shows `drift` badge | Yes — user clicks "Sync" or "Dismiss" on the node |
| Delete SkillNode from graph | Skill document remains in KB (not deleted) | No — skill persists independently |
| Delete skill document from KB | All referencing SkillNodes show `orphaned` warning | Yes — user must rebind or remove nodes |
| Import updated API spec | New skill document version created, SkillNodes show `drift` | Yes — user reviews diff and accepts |

### 15.6 SkillNode Visual Design

```
┌─ ⬡ ───────────────────────────┐
│  🔍  Web Search                │  ← Hexagonal accent + category icon + name
│  ─────────────────────────────│
│  Provider: Google              │  ← Provider badge
│  ─────────────────────────────│
│  IN:  query (string) ●        │  ← Input handles (connectable)
│       max_results (num)        │
│  OUT: results (array) ●       │  ← Output handles (connectable)
│  ─────────────────────────────│
│  ⟳ synced  │  3 ASDs use this │  ← Sync status badge + usage count
└───────────────────────────────┘
```

**Visual distinctions from ActionNode**:
- **Hexagonal shape accent** (clipped top-left corner or hex border pattern) vs ActionNode's plain rounded rect
- **Teal-500 color** vs ActionNode's blue-500
- **Input/output schema visible** on the node face (ActionNode only shows the tool name)
- **Sync status badge** in the footer (ActionNode has no sync concept)
- **Category icon** (search, mail, database, etc.) instead of the generic Zap icon

### 15.7 SkillNode Edge Types

| Connection | Meaning | Visual |
|------------|---------|--------|
| ActionNode → SkillNode | "This action uses this skill" | Solid teal edge with `Cpu` icon label |
| SkillNode → ActionNode | "This skill feeds results to this action" | Solid teal edge, data flow direction |
| SkillNode → DecisionNode | "Skill output determines branch" | Teal-to-amber gradient edge |

### 15.8 Skill Document Inspector Panel

When a SkillNode is selected, the inspector panel shows:

1. **Header**: Skill name, provider logo, category badge
2. **Schema tab**: Input/output schema with types, descriptions, required flags — editable
3. **API tab**: Connector binding, endpoint, auth method, rate limits — editable
4. **Usage tab**: List of all ASDs that reference this skill, with click-to-navigate
5. **History tab**: Version history of the skill document, with diff view
6. **Sync status**: Current sync state, last synced timestamp, "Sync Now" button

### 15.9 Quality Checklist — Skills

- [ ] SkillNodes visually distinct from ActionNodes (hex accent, teal color, schema display)
- [ ] Drag from Knowledge Base panel creates correctly-bound SkillNode
- [ ] Edit SkillNode → skill document updates in knowledge base
- [ ] Skill document change → SkillNode shows drift badge
- [ ] Delete skill from KB → orphaned SkillNodes show warning
- [ ] Import OpenAPI spec → creates valid SkillDocument with correct schema
- [ ] Connector scan → discovers and lists available tools as skills
- [ ] SkillNode inspector shows input/output schema, API binding, usage, history
- [ ] Sync status badge renders correctly for all 3 states (synced, drift, pending)

---

## 16. Animated Ingestion Flow (Left-to-Right Pipeline)

### 16.1 Concept

When a user submits a document or NL query, the graph **animates the LLM's
extraction process in real-time**, building nodes left-to-right as the agent
discovers requirements, contracts, and skill bindings.

```
INPUT (left)  →  EXTRACTION (animated)  →  SKILLS (right)  →  OUTPUT (far right)
────────────────────────────────────────────────────────────────────────────────
Document/NL   →  LLM parses sections   →  Nodes appear    →  Contract checklist
              →  Edges animate in       →  Skills light up  →  Coverage score
```

### 16.2 Animation Sequence

When ingestion starts, the graph canvas shows a progressive left-to-right build:

| Phase | Duration | What Animates |
|-------|----------|---------------|
| 1. Input node appears | 0.3s | StartNode fades in at far left with the document/query label |
| 2. Extraction beam | 0.5s per section | An animated edge extends rightward from the start node. Each section the LLM extracts creates a new node that "grows" into place (scale 0→1 + fade in) |
| 3. Skill binding | 0.2s per skill | When the LLM identifies a tool call, a SkillNode appears below/right with a teal edge animating from the ActionNode to the SkillNode |
| 4. Contract derivation | 0.2s per contract | Contract badges fade in on nodes where the LLM detects compliance language |
| 5. Terminal nodes | 0.3s | EndNode / ErrorNode appear at far right, completing the DAG |
| 6. Fit view | 0.6s | `fitView({ padding: 0.2, duration: 600 })` smoothly frames the complete graph |

### 16.3 Streaming Integration

The animation is driven by **SSE events from the FastAPI ingestion endpoint**:

```typescript
type IngestionEvent =
  | { type: 'section_parsed'; sectionTitle: string; nodeType: string; nodeData: Partial<ASDNode> }
  | { type: 'edge_created'; source: string; target: string; edgeType: string }
  | { type: 'skill_identified'; skillName: string; provider: string; connectedNodeId: string }
  | { type: 'contract_derived'; nodeId: string; rule: string; ruleType: 'must_always' | 'must_never' | 'must_escalate' }
  | { type: 'gap_detected'; nodeId: string; reason: string }
  | { type: 'ingestion_complete'; coverageScore: number; nodeCount: number; edgeCount: number }
  | { type: 'clarification_needed'; nodeId: string; question: string };
```

Each event triggers the corresponding animation. The hook `useIngestionStream` batches
events per 16ms frame and applies them to the Zustand store with animation metadata.

### 16.4 Node Entrance Animation

```css
.asd-node--entering {
  animation: node-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes node-enter {
  from {
    opacity: 0;
    transform: scale(0.8) translateX(-12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}
```

Edges animate using `stroke-dasharray` + `stroke-dashoffset` to "draw" from source to target.

---

## 17. Sidebar Tabs — Knowledge Base & Skill Documents

The application sidebar (currently just Workflows + Marketplace) gains two new tabs
that serve as the document upload and management layer.

### 17.1 Tab Structure

```
Sidebar Tabs:
┌────────────┬────────────┬────────────┬────────────┐
│ Workflows  │ Knowledge  │ Skills     │ Marketplace│
│            │ Base       │            │            │
└────────────┴────────────┴────────────┴────────────┘
```

### 17.2 Knowledge Base Tab (`/knowledge`)

**Purpose**: Upload and manage source-of-truth documents (SOPs, policies, process guides).
These are the raw inputs that the ingestion layer transforms into ASDs.

**UI**:
```
┌──────────────────────────────────────┐
│  📚 Knowledge Base                   │
│  ──────────────────────────────────  │
│  🔍 Search documents...              │
│  ──────────────────────────────────  │
│  ┌─ ↑ Upload Document ────────────┐  │
│  │  Drop PDF, DOCX, or paste URL  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ▸ SOPs (4)                          │
│    ○ Vendor Onboarding v2.1  PDF    │
│      → ASD v4 (synced)              │
│    ○ Customer Refund Policy  DOCX   │
│      → ASD v2 (drift detected!)     │
│    ○ Incident Response       Notion │
│      → ASD v1 (synced)              │
│    ○ New Hire Checklist      DOCX   │
│      → No ASD yet                   │
│                                      │
│  ▸ Policies (2)                      │
│    ○ Data Privacy Policy     PDF    │
│    ○ Expense Approval Rules  DOCX   │
│                                      │
│  ──────────────────────────────────  │
│  Documents: 6  │  With ASD: 3       │
└──────────────────────────────────────┘
```

**Features**:
- **Upload**: PDF, DOCX, or paste a Notion/Confluence URL
- **Categorize**: SOPs, Policies, Process Guides, Other
- **Link to ASD**: Each document shows which ASD was derived from it (if any)
- **Drift detection**: If a document is re-uploaded or URL content changes, surface a drift warning on the linked ASD
- **One-click ingest**: "Generate ASD" button on any document triggers the ingestion pipeline → animated graph build
- **Version tracking**: Document version hash for drift detection

**Data model**:
```typescript
type KnowledgeDocument = {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'notion' | 'confluence' | 'text';
  category: 'sop' | 'policy' | 'process_guide' | 'other';
  sourceUrl?: string;           // For Notion/Confluence
  fileHash: string;             // For drift detection
  uploadedAt: string;
  linkedAsdId?: string;         // Which ASD was derived from this
  linkedAsdVersion?: number;
  driftDetected: boolean;
};
```

### 17.3 Skills Tab (`/skills`)

**Purpose**: Upload skill documents and manage the skill knowledge base. Uploading a
skill document automatically creates SkillNodes that can be dragged onto any ASD graph.

**UI**:
```
┌──────────────────────────────────────┐
│  ⚙️ Skill Library                    │
│  ──────────────────────────────────  │
│  🔍 Search skills...                 │
│  ──────────────────────────────────  │
│  ┌─ + Add Skill ──────────────────┐  │
│  │  Import OpenAPI  │  Manual     │  │
│  │  Scan Connector  │  Upload Doc │  │
│  └────────────────────────────────┘  │
│                                      │
│  ▸ Search (2)                        │
│    ● Web Search         Google       │
│      Used in: 3 ASDs                 │
│    ● Knowledge Retrieval RAG         │
│      Used in: 1 ASD                  │
│                                      │
│  ▸ Communication (3)                 │
│    ● Send Email         Gmail        │
│    ● Post Message       Slack        │
│    ● Create Ticket      Jira         │
│                                      │
│  ▸ Data (2)                          │
│    ● CRM Lookup         Salesforce   │
│    ● DB Query           Postgres     │
│                                      │
│  ──────────────────────────────────  │
│  Skills: 7  │  Active in ASDs: 5     │
└──────────────────────────────────────┘
```

**Features**:
- **Import methods**: OpenAPI spec upload, connector scan, manual creation, skill document upload
- **Auto-node creation**: Importing a skill document creates a SkillNode definition in the registry. The node can then be dragged onto any ASD canvas.
- **Usage tracking**: Each skill shows how many ASDs reference it
- **Drag to canvas**: Drag a skill from this tab directly onto an open ASD graph to create a SkillNode
- **Bidirectional sync**: Edit a SkillNode on the graph → skill document updates here. Edit here → SkillNodes on graphs show drift badge.

### 17.4 Sidebar Route Updates

Add to the existing `Sidebar.tsx` NAV array:

```typescript
const NAV = [
  { href: '/', icon: GitBranch, label: 'Workflows' },
  { href: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { href: '/skills', icon: Cpu, label: 'Skills' },
  { href: '/marketplace', icon: Store, label: 'Marketplace' },
];
```

New pages:
- `app/knowledge/page.tsx` → Knowledge Base document manager
- `app/skills/page.tsx` → Skill library manager

---

*This document is the contract between design and engineering for the Chorus
React Flow Graph Visualizer. Every node type, every data shape, every visual
state, and every interaction is specified here. Build to this spec.*
