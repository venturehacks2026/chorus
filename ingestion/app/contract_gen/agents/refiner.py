"""Agent 4 — Refiner: Targeted fixes for unresolved findings."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Template

from app.contract_gen.dsl import parse_and_validate, serialize_yaml
from app.contract_gen.state import ContractGenState, Finding
from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "refiner.j2"


def run_refiner(state: ContractGenState) -> ContractGenState:
    """Fix unresolved findings by revising contracts."""
    state.current_agent = "refiner"
    unresolved = state.unresolved_findings()
    logger.info(f"[{state.run_id}] Running refiner on {len(unresolved)} unresolved findings")

    if not unresolved:
        return state

    # Build contract YAML representations
    contract_entries = []
    for i, contract in enumerate(state.contracts):
        yaml_str = state.draft_yamls[i] if i < len(state.draft_yamls) else serialize_yaml(contract)
        contract_entries.append({"yaml": yaml_str})

    # Build findings list for prompt
    findings_for_prompt = [f.to_dict() for f in unresolved]

    template = Template(_PROMPT_PATH.read_text())
    prompt = template.render(
        contracts=contract_entries,
        findings=findings_for_prompt,
        asd_nodes_json=json.dumps(state.asd_nodes, indent=2),
    )

    try:
        result = chat_completion_json(
            messages=[
                {"role": "system", "content": "You are a contract refiner. Fix specific issues and return valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
    except Exception as e:
        logger.error(f"[{state.run_id}] Refiner LLM call failed: {e}")
        # Mark all unresolved as needs_human_review
        for f in unresolved:
            f.status = "needs_human_review"
            f.resolution = f"Refiner failed: {e}"
        return state

    # Apply revised contracts
    revised = result.get("revised_contracts", [])
    if revised:
        new_yamls: list[str] = []
        new_contracts: list[dict] = []

        for entry in revised:
            yaml_str = entry.get("yaml", "") if isinstance(entry, dict) else str(entry)
            if not yaml_str.strip():
                continue

            contract, errors = parse_and_validate(yaml_str)
            if contract is None:
                logger.warning(f"[{state.run_id}] Refiner produced unparseable YAML, keeping original")
                continue

            new_yamls.append(yaml_str)
            new_contracts.append(contract)

        if new_contracts:
            state.draft_yamls = new_yamls
            state.contracts = new_contracts

    # Apply finding resolutions
    now = datetime.now(timezone.utc).isoformat()
    for resolution in result.get("finding_resolutions", []):
        idx = resolution.get("finding_index")
        if idx is not None and 0 <= idx < len(unresolved):
            finding = unresolved[idx]
            new_status = resolution.get("status", "resolved")
            if new_status in ("resolved", "needs_human_review"):
                finding.status = new_status
                finding.resolution = resolution.get("resolution", "")
                if new_status == "resolved":
                    finding.resolved_at = now

    logger.info(
        f"[{state.run_id}] Refiner done: {len(state.contracts)} contracts, "
        f"{len(state.unresolved_findings())} still unresolved"
    )

    return state
