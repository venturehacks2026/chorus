"""Agent 2 — Drafter: Writes behavioral contracts in YAML DSL format."""

import json
import logging
from pathlib import Path

from jinja2 import Template

from app.contract_gen.dsl import parse_and_validate
from app.contract_gen.state import ContractGenState, Finding
from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "drafter.j2"


def run_drafter(state: ContractGenState) -> ContractGenState:
    """Generate YAML DSL contracts from planner output."""
    state.current_agent = "drafter"
    logger.info(f"[{state.run_id}] Running drafter for ASD {state.asd_id}")

    risk_analysis = {
        "risk_surface": state.risk_surface,
        "rule_candidates": state.rule_candidates,
        "escalation_points": state.escalation_points,
        "coverage_notes": state.coverage_notes,
    }

    template = Template(_PROMPT_PATH.read_text())
    prompt = template.render(
        sop_text=state.sop_text,
        risk_analysis_json=json.dumps(risk_analysis, indent=2),
        asd_nodes_json=json.dumps(state.asd_nodes, indent=2),
    )

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are a behavioral contract drafter for AI agents. Return valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    raw_contracts = result.get("contracts", [])
    state.draft_yamls = []
    state.contracts = []

    for i, entry in enumerate(raw_contracts):
        yaml_str = entry.get("yaml", "") if isinstance(entry, dict) else str(entry)
        if not yaml_str.strip():
            continue

        contract, errors = parse_and_validate(yaml_str)

        if contract is None:
            # Parse failure → finding
            state.findings.append(Finding(
                finding_type="executability_error",
                severity="high",
                description=f"Contract {i}: YAML parse failure",
                details={"errors": errors, "raw_yaml": yaml_str[:500]},
            ))
            continue

        state.draft_yamls.append(yaml_str)
        state.contracts.append(contract)

        # Log validation errors as findings but keep the contract
        for err in errors:
            state.findings.append(Finding(
                finding_type="executability_error",
                severity="medium",
                description=err,
                details={"contract_index": i, "contract_name": contract.get("name", "?")},
            ))

    logger.info(
        f"[{state.run_id}] Drafter produced {len(state.contracts)} contracts, "
        f"{len(state.findings)} parse/validation findings"
    )

    return state
