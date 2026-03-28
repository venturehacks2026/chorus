"""ContractGenState — mutable state carried through the pipeline."""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class Finding:
    finding_type: str  # coverage_gap | consistency_conflict | executability_error
    severity: str
    description: str
    details: dict = field(default_factory=dict)
    status: str = "unresolved"  # resolved | unresolved | needs_human_review
    resolution: str | None = None
    resolved_at: str | None = None
    contract_id: str | None = None
    loop_iteration: int = 0

    def to_dict(self) -> dict:
        return {
            "finding_type": self.finding_type,
            "severity": self.severity,
            "description": self.description,
            "details": self.details,
            "status": self.status,
            "resolution": self.resolution,
            "resolved_at": self.resolved_at,
            "contract_id": self.contract_id,
            "loop_iteration": self.loop_iteration,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Finding:
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class ContractGenState:
    """Mutable state passed between agents in the pipeline."""

    asd_id: str
    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sop_text: str = ""
    asd_nodes: list[dict] = field(default_factory=list)

    # Planner output
    risk_surface: list[dict] = field(default_factory=list)
    rule_candidates: list[dict] = field(default_factory=list)
    escalation_points: list[dict] = field(default_factory=list)
    coverage_notes: str = ""

    # Drafter output — list of YAML strings
    draft_yamls: list[str] = field(default_factory=list)
    # Parsed contract dicts (after YAML parse)
    contracts: list[dict] = field(default_factory=list)

    # Validator + Refiner
    findings: list[Finding] = field(default_factory=list)
    loop_count: int = 0
    current_agent: str = ""

    def unresolved_findings(self) -> list[Finding]:
        return [f for f in self.findings if f.status == "unresolved"]

    def to_json(self) -> str:
        return json.dumps(self._to_dict(), default=str)

    def _to_dict(self) -> dict:
        return {
            "asd_id": self.asd_id,
            "run_id": self.run_id,
            "sop_text": self.sop_text,
            "asd_nodes": self.asd_nodes,
            "risk_surface": self.risk_surface,
            "rule_candidates": self.rule_candidates,
            "escalation_points": self.escalation_points,
            "coverage_notes": self.coverage_notes,
            "draft_yamls": self.draft_yamls,
            "contracts": self.contracts,
            "findings": [f.to_dict() for f in self.findings],
            "loop_count": self.loop_count,
            "current_agent": self.current_agent,
        }

    @classmethod
    def from_json(cls, json_str: str) -> ContractGenState:
        d = json.loads(json_str)
        findings = [Finding.from_dict(f) for f in d.pop("findings", [])]
        state = cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})
        state.findings = findings
        return state
