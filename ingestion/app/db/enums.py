import enum


class SourceType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    confluence = "confluence"
    notion = "notion"
    text = "text"


class ASDStatus(str, enum.Enum):
    compiling = "compiling"
    active = "active"
    needs_clarification = "needs_clarification"
    needs_recompile = "needs_recompile"
    archived = "archived"


class NodeType(str, enum.Enum):
    action = "action"
    decision = "decision"
    human_handoff = "human_handoff"
    wait = "wait"
    start = "start"
    end = "end"
    error = "error"


class EdgeType(str, enum.Enum):
    sequential = "sequential"
    true_branch = "true_branch"
    false_branch = "false_branch"
    error_handler = "error_handler"


class ClarificationStatus(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"
    dismissed = "dismissed"


class ContractType(str, enum.Enum):
    must_always = "must_always"
    must_never = "must_never"
    must_escalate = "must_escalate"


class ContractStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    suspended = "suspended"
    archived = "archived"
