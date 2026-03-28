"""Pipeline orchestrator for contract generation.

Sequences: Planner → Drafter → Validator ↔ Refiner (loop max 3).
Checkpoints state to contract_gen_runs for crash recovery.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.contract_gen.agents.drafter import run_drafter
from app.contract_gen.agents.planner import run_planner
from app.contract_gen.agents.refiner import run_refiner
from app.contract_gen.agents.validator import run_validator
from app.contract_gen.dsl import SEVERITY_ACTION_MAP, serialize_yaml
from app.contract_gen.state import ContractGenState
from app.db.client import get_supabase

logger = logging.getLogger(__name__)

MAX_REFINE_LOOPS = 3


def run_contract_gen_pipeline(
    asd_id: str,
    asd_nodes: list[dict],
    sop_text: str,
) -> dict:
    """Run the full contract generation pipeline.

    Returns dict with keys: run_id, contracts_count, findings_count, status.
    """
    db = get_supabase()

    # Build initial state
    state = ContractGenState(
        asd_id=asd_id,
        sop_text=sop_text,
        asd_nodes=asd_nodes,
    )

    # Create run record
    db.table("contract_gen_runs").insert({
        "id": state.run_id,
        "asd_id": asd_id,
        "status": "running",
        "current_agent": "planner",
    }).execute()

    try:
        # 1. Planner
        state = run_planner(state)
        _checkpoint(db, state)

        # 2. Drafter
        state = run_drafter(state)
        _checkpoint(db, state)

        # 3. Validator ↔ Refiner loop
        for i in range(MAX_REFINE_LOOPS):
            state.loop_count = i + 1

            state = run_validator(state)
            _checkpoint(db, state)

            if not state.unresolved_findings():
                logger.info(f"[{state.run_id}] No unresolved findings after iteration {i + 1}, done")
                break

            state = run_refiner(state)
            _checkpoint(db, state)

            if not state.unresolved_findings():
                logger.info(f"[{state.run_id}] All findings resolved after refiner iteration {i + 1}")
                break

        # Mark remaining unresolved as needs_human_review
        for finding in state.unresolved_findings():
            finding.status = "needs_human_review"
            finding.resolution = "Unresolved after max refinement loops"

        # Persist results
        _save_contracts(db, state)
        _save_findings(db, state)

        # Mark run as completed
        db.table("contract_gen_runs").update({
            "status": "completed",
            "current_agent": None,
            "loop_count": state.loop_count,
            "state_snapshot": json.loads(state.to_json()),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", state.run_id).execute()

        logger.info(
            f"[{state.run_id}] Pipeline complete: {len(state.contracts)} contracts, "
            f"{len(state.findings)} findings"
        )

        return {
            "run_id": state.run_id,
            "contracts_count": len(state.contracts),
            "findings_count": len(state.findings),
            "status": "completed",
        }

    except Exception as e:
        logger.error(f"[{state.run_id}] Pipeline failed: {e}", exc_info=True)
        db.table("contract_gen_runs").update({
            "status": "failed",
            "error": str(e)[:1000],
            "state_snapshot": json.loads(state.to_json()),
        }).eq("id", state.run_id).execute()
        raise


def _checkpoint(db: Any, state: ContractGenState) -> None:
    """Save state snapshot to contract_gen_runs for crash recovery."""
    db.table("contract_gen_runs").update({
        "current_agent": state.current_agent,
        "loop_count": state.loop_count,
        "state_snapshot": json.loads(state.to_json()),
    }).eq("id", state.run_id).execute()


def _save_contracts(db: Any, state: ContractGenState) -> None:
    """Persist generated contracts to derived_contracts."""
    # Delete existing generated contracts for this ASD (from previous runs)
    db.table("derived_contracts").delete().eq(
        "asd_id", state.asd_id
    ).not_.is_("generation_run_id", "null").execute()

    for i, contract in enumerate(state.contracts):
        yaml_str = state.draft_yamls[i] if i < len(state.draft_yamls) else serialize_yaml(contract)
        severity = contract.get("severity")
        on_violation = contract.get("on_violation")

        # Default on_violation from severity
        if not on_violation and severity:
            on_violation = {"action": SEVERITY_ACTION_MAP.get(severity, "LOG")}

        # Map DSL rule types to existing contract_type enum
        contract_type = _infer_contract_type(contract)

        db.table("derived_contracts").insert({
            "id": str(uuid.uuid4()),
            "asd_id": state.asd_id,
            "contract_name": contract.get("name", f"contract_{i}"),
            "contract_type": contract_type,
            "description": contract.get("summary", ""),
            "source_text": ", ".join(contract.get("source_quotes", [])),
            "scope_node_ids": contract.get("scope_node_ids", []),
            "severity": severity,
            "dsl_yaml": yaml_str,
            "on_violation": on_violation,
            "generation_run_id": state.run_id,
            "status": "draft",
        }).execute()


def _infer_contract_type(contract: dict) -> str:
    """Infer the primary contract_type from rules present."""
    rules = contract.get("rules", {})
    if rules.get("must_never"):
        return "must_never"
    if rules.get("escalate_when"):
        return "must_escalate"
    return "must_always"


def _save_findings(db: Any, state: ContractGenState) -> None:
    """Persist findings to contract_findings."""
    for finding in state.findings:
        db.table("contract_findings").insert({
            "id": str(uuid.uuid4()),
            "asd_id": state.asd_id,
            "generation_run_id": state.run_id,
            "contract_id": finding.contract_id,
            "finding_type": finding.finding_type,
            "severity": finding.severity,
            "description": finding.description,
            "details": finding.details,
            "status": finding.status,
            "resolution": finding.resolution,
            "resolved_at": finding.resolved_at,
            "loop_iteration": finding.loop_iteration,
        }).execute()
