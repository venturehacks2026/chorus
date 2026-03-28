"""HTTP endpoints for contract generation and human review."""

import logging
import uuid

from fastapi import APIRouter, HTTPException

from app.contract_gen.checks import check_activation_gate, check_executability
from app.contract_gen.dsl import parse_and_validate
from app.contract_gen.pipeline import run_contract_gen_pipeline
from app.contract_gen.schemas import (
    ActivationGateResponse,
    ContractDismissRequest,
    ContractEditRequest,
    ContractGenRunResponse,
    ContractListResponse,
    ContractResponse,
    FindingResponse,
    GenerateRequest,
)
from app.db.client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/contracts", tags=["contracts"])


@router.get("", response_model=ContractListResponse)
async def list_contracts(asd_id: uuid.UUID):
    """List contracts, findings, and activation gate status for an ASD."""
    db = get_supabase()

    # Fetch contracts
    contracts_result = (
        db.table("derived_contracts")
        .select("*")
        .eq("asd_id", str(asd_id))
        .order("created_at")
        .execute()
    )
    contracts = contracts_result.data or []

    # Fetch findings
    findings_result = (
        db.table("contract_findings")
        .select("*")
        .eq("asd_id", str(asd_id))
        .order("created_at")
        .execute()
    )
    findings = findings_result.data or []

    # Fetch latest run
    runs_result = (
        db.table("contract_gen_runs")
        .select("*")
        .eq("asd_id", str(asd_id))
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    latest_run = runs_result.data[0] if runs_result.data else None

    # Compute activation gate
    parsed_contracts = []
    for c in contracts:
        if c.get("dsl_yaml"):
            parsed, _ = parse_and_validate(c["dsl_yaml"])
            if parsed:
                parsed_contracts.append(parsed)

    # Get ASD nodes for gate check
    asd_nodes = _get_asd_nodes(db, str(asd_id))

    finding_dicts = [{"status": f.get("status")} for f in findings]
    can_activate, reasons = check_activation_gate(parsed_contracts, asd_nodes, finding_dicts)

    return ContractListResponse(
        contracts=[ContractResponse(**c) for c in contracts],
        findings=[FindingResponse(**f) for f in findings],
        latest_run=ContractGenRunResponse(**latest_run) if latest_run else None,
        activation_gate=ActivationGateResponse(can_activate=can_activate, reasons=reasons),
    )


@router.post("/generate/{asd_id}")
async def generate_contracts(asd_id: uuid.UUID, body: GenerateRequest | None = None):
    """Trigger full pipeline (re)generation for an ASD."""
    db = get_supabase()

    # Load ASD
    asd_result = db.table("agent_skill_documents").select("*").eq("id", str(asd_id)).execute()
    if not asd_result.data:
        raise HTTPException(status_code=404, detail="ASD not found")
    asd = asd_result.data[0]

    # Load SOP text
    sop_result = db.table("sop_documents").select("raw_text").eq("id", asd["sop_id"]).execute()
    if not sop_result.data:
        raise HTTPException(status_code=404, detail="Source SOP not found")
    sop_text = sop_result.data[0]["raw_text"]

    # Load ASD nodes
    asd_nodes = _get_asd_nodes(db, str(asd_id))

    # Check for running pipeline
    running = (
        db.table("contract_gen_runs")
        .select("id")
        .eq("asd_id", str(asd_id))
        .eq("status", "running")
        .execute()
    )
    if running.data and not (body and body.force):
        raise HTTPException(
            status_code=409,
            detail="A pipeline is already running for this ASD. Use force=true to override.",
        )

    # Run pipeline
    result = run_contract_gen_pipeline(
        asd_id=str(asd_id),
        asd_nodes=asd_nodes,
        sop_text=sop_text,
    )

    return result


@router.post("/{contract_id}/activate")
async def activate_contract(contract_id: uuid.UUID):
    """Activate a contract after verifying the activation gate."""
    db = get_supabase()

    # Load contract
    contract_result = (
        db.table("derived_contracts").select("*").eq("id", str(contract_id)).execute()
    )
    if not contract_result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract = contract_result.data[0]

    # Load all contracts for this ASD
    all_contracts_result = (
        db.table("derived_contracts")
        .select("*")
        .eq("asd_id", contract["asd_id"])
        .execute()
    )
    all_contracts = all_contracts_result.data or []

    # Parse contracts
    parsed_contracts = []
    for c in all_contracts:
        if c.get("dsl_yaml"):
            parsed, _ = parse_and_validate(c["dsl_yaml"])
            if parsed:
                parsed_contracts.append(parsed)

    # Get ASD nodes
    asd_nodes = _get_asd_nodes(db, contract["asd_id"])

    # Get findings
    findings_result = (
        db.table("contract_findings")
        .select("status")
        .eq("asd_id", contract["asd_id"])
        .execute()
    )
    finding_dicts = findings_result.data or []

    can_activate, reasons = check_activation_gate(parsed_contracts, asd_nodes, finding_dicts)
    if not can_activate:
        raise HTTPException(status_code=422, detail={"reasons": reasons})

    # Activate
    db.table("derived_contracts").update({
        "status": "active",
    }).eq("id", str(contract_id)).execute()

    return {"status": "active", "contract_id": str(contract_id)}


@router.post("/{contract_id}/dismiss")
async def dismiss_contract(contract_id: uuid.UUID, body: ContractDismissRequest):
    """Archive a contract with a required reason."""
    db = get_supabase()

    contract_result = (
        db.table("derived_contracts").select("id").eq("id", str(contract_id)).execute()
    )
    if not contract_result.data:
        raise HTTPException(status_code=404, detail="Contract not found")

    db.table("derived_contracts").update({
        "status": "archived",
    }).eq("id", str(contract_id)).execute()

    return {"status": "archived", "contract_id": str(contract_id), "reason": body.reason}


@router.patch("/{contract_id}")
async def edit_contract(contract_id: uuid.UUID, body: ContractEditRequest):
    """Edit a contract's dsl_yaml and re-run Python checks."""
    db = get_supabase()

    contract_result = (
        db.table("derived_contracts").select("*").eq("id", str(contract_id)).execute()
    )
    if not contract_result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract = contract_result.data[0]

    # Parse and validate new YAML
    parsed, errors = parse_and_validate(body.dsl_yaml)
    if parsed is None:
        raise HTTPException(status_code=422, detail={"errors": errors})

    # Get ASD nodes for executability check
    asd_nodes = _get_asd_nodes(db, contract["asd_id"])

    # Run executability check
    exec_findings = check_executability([parsed], asd_nodes)

    # Update contract
    severity = parsed.get("severity")
    on_violation = parsed.get("on_violation")
    update_data = {
        "dsl_yaml": body.dsl_yaml,
        "contract_name": parsed.get("name", contract["contract_name"]),
        "description": parsed.get("summary", contract["description"]),
        "scope_node_ids": parsed.get("scope_node_ids", []),
        "severity": severity,
        "on_violation": on_violation,
    }

    db.table("derived_contracts").update(update_data).eq("id", str(contract_id)).execute()

    return {
        "contract_id": str(contract_id),
        "validation_errors": [{"description": f.description} for f in exec_findings],
        "valid": len(exec_findings) == 0,
    }


def _get_asd_nodes(db, asd_id: str) -> list[dict]:
    """Load ASD nodes for the latest version."""
    # Get latest version
    version_result = (
        db.table("asd_versions")
        .select("id")
        .eq("asd_id", asd_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    if not version_result.data:
        return []

    version_id = version_result.data[0]["id"]
    nodes_result = (
        db.table("asd_nodes")
        .select("node_id, type, description, config")
        .eq("asd_version_id", version_id)
        .execute()
    )
    return nodes_result.data or []
