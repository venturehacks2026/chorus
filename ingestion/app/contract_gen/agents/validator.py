"""Agent 3 — Validator: Runs coverage, consistency, and executability checks."""

import json
import logging
from pathlib import Path

from jinja2 import Template

from app.contract_gen.checks import check_coverage, check_executability
from app.contract_gen.dsl import serialize_yaml
from app.contract_gen.state import ContractGenState, Finding
from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

_CONSISTENCY_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "validator_consistency.j2"


def run_validator(state: ContractGenState) -> ContractGenState:
    """Run all three validation checks: coverage, consistency, executability."""
    state.current_agent = "validator"
    iteration = state.loop_count
    logger.info(f"[{state.run_id}] Running validator (iteration {iteration})")

    # 1. Coverage check (pure Python)
    coverage_findings = check_coverage(
        contracts=state.contracts,
        asd_nodes=state.asd_nodes,
        loop_iteration=iteration,
    )
    logger.info(f"[{state.run_id}] Coverage check: {len(coverage_findings)} gaps")

    # 2. Consistency check (LLM)
    consistency_findings = _check_consistency(state, iteration)
    logger.info(f"[{state.run_id}] Consistency check: {len(consistency_findings)} conflicts")

    # 3. Executability check (pure Python)
    exec_findings = check_executability(
        contracts=state.contracts,
        asd_nodes=state.asd_nodes,
        loop_iteration=iteration,
    )
    logger.info(f"[{state.run_id}] Executability check: {len(exec_findings)} errors")

    # Deduplicate: only add findings not already tracked
    existing_keys = {
        (f.finding_type, f.description)
        for f in state.findings
    }
    new_findings = coverage_findings + consistency_findings + exec_findings
    deduplicated = [
        f for f in new_findings
        if (f.finding_type, f.description) not in existing_keys
    ]
    state.findings.extend(deduplicated)

    logger.info(
        f"[{state.run_id}] Validator total: {len(deduplicated)} new findings "
        f"({len(new_findings) - len(deduplicated)} duplicates skipped), "
        f"{len(state.unresolved_findings())} unresolved"
    )

    return state


def _check_consistency(state: ContractGenState, iteration: int) -> list[Finding]:
    """Use LLM to detect contradictions between contracts."""
    if len(state.contracts) < 2:
        return []

    # Build contract YAML representations for the prompt
    contract_entries = []
    for i, contract in enumerate(state.contracts):
        yaml_str = state.draft_yamls[i] if i < len(state.draft_yamls) else serialize_yaml(contract)
        contract_entries.append({"yaml": yaml_str})

    template = Template(_CONSISTENCY_PROMPT_PATH.read_text())
    prompt = template.render(contracts=contract_entries)

    try:
        result = chat_completion_json(
            messages=[
                {"role": "system", "content": "You are a consistency auditor for behavioral contracts. Return valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
    except Exception as e:
        logger.warning(f"[{state.run_id}] Consistency check LLM call failed: {e}")
        return []

    findings: list[Finding] = []
    for conflict in result.get("conflicts", []):
        findings.append(Finding(
            finding_type="consistency_conflict",
            severity=conflict.get("severity", "medium"),
            description=conflict.get("description", "Undescribed conflict"),
            details={
                "type": conflict.get("type"),
                "contract_a": conflict.get("contract_a"),
                "rule_a": conflict.get("rule_a"),
                "contract_b": conflict.get("contract_b"),
                "rule_b": conflict.get("rule_b"),
                "suggested_resolution": conflict.get("suggested_resolution"),
            },
            loop_iteration=iteration,
        ))

    return findings
