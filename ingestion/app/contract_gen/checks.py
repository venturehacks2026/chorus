"""Pure Python validation checks for contracts.

Three check types:
1. Coverage — every write/send/delete/pay node must be covered by a contract
2. Executability — structural validity of contracts (fields, references)
3. Activation gate — all conditions for activating an ASD's contracts
"""

import logging
from typing import Any

from app.contract_gen.dsl import (
    VALID_SEVERITIES,
    VALID_VIOLATION_ACTIONS,
    get_scope_node_ids,
    validate_contract,
)
from app.contract_gen.state import Finding

logger = logging.getLogger(__name__)

# Tool types that require contract coverage
HIGH_RISK_TOOLS = {"write", "send", "delete", "pay", "transfer", "execute", "approve"}


def _extract_node_tools(node: dict) -> set[str]:
    """Extract tool names from a node's config."""
    config = node.get("config", {}) or {}
    tools = set()
    if "tool" in config:
        tools.add(config["tool"].lower())
    if "tools" in config:
        for t in config["tools"]:
            if isinstance(t, str):
                tools.add(t.lower())
            elif isinstance(t, dict) and "name" in t:
                tools.add(t["name"].lower())
    return tools


def check_coverage(
    contracts: list[dict],
    asd_nodes: list[dict],
    loop_iteration: int = 0,
) -> list[Finding]:
    """Check that every high-risk node is covered by at least one contract's scope_node_ids."""
    findings: list[Finding] = []

    # Collect all node_ids covered by any contract
    covered_ids: set[str] = set()
    for c in contracts:
        covered_ids.update(get_scope_node_ids(c))

    # Find high-risk nodes not covered
    for node in asd_nodes:
        node_id = node.get("node_id", "")
        tools = _extract_node_tools(node)
        risky = tools & HIGH_RISK_TOOLS

        if risky and node_id not in covered_ids:
            findings.append(Finding(
                finding_type="coverage_gap",
                severity="high",
                description=f"Node '{node_id}' uses high-risk tool(s) {risky} but is not covered by any contract",
                details={"node_id": node_id, "tools": sorted(risky)},
                loop_iteration=loop_iteration,
            ))

    return findings


def check_executability(
    contracts: list[dict],
    asd_nodes: list[dict],
    loop_iteration: int = 0,
) -> list[Finding]:
    """Structural validation of each contract."""
    findings: list[Finding] = []
    known_node_ids = {n.get("node_id", "") for n in asd_nodes}

    for contract in contracts:
        name = contract.get("name", "<unnamed>")

        # Run DSL schema validation
        schema_errors = validate_contract(contract)
        for err in schema_errors:
            findings.append(Finding(
                finding_type="executability_error",
                severity="medium",
                description=err,
                details={"contract_name": name},
                loop_iteration=loop_iteration,
            ))

        # Check scope_node_ids reference valid nodes
        for nid in get_scope_node_ids(contract):
            if nid not in known_node_ids:
                findings.append(Finding(
                    finding_type="executability_error",
                    severity="medium",
                    description=f"Contract '{name}': scope_node_id '{nid}' does not exist in ASD",
                    details={"contract_name": name, "invalid_node_id": nid},
                    loop_iteration=loop_iteration,
                ))

        # Check escalate_when rules have non-empty escalate_to
        rules = contract.get("rules", {})
        for rule in rules.get("escalate_when", []):
            if not rule.get("escalate_to", "").strip():
                findings.append(Finding(
                    finding_type="executability_error",
                    severity="high",
                    description=f"Contract '{name}' escalation rule '{rule.get('id', '?')}': empty escalate_to",
                    details={"contract_name": name, "rule_id": rule.get("id")},
                    loop_iteration=loop_iteration,
                ))

    return findings


def check_activation_gate(
    contracts: list[dict],
    asd_nodes: list[dict],
    findings: list[dict] | None = None,
) -> tuple[bool, list[str]]:
    """Check whether contracts are ready for activation.

    Returns (can_activate, reasons_if_not).
    """
    reasons: list[str] = []

    # 1. Every high-risk node must be covered
    covered_ids: set[str] = set()
    for c in contracts:
        covered_ids.update(get_scope_node_ids(c))

    for node in asd_nodes:
        node_id = node.get("node_id", "")
        tools = _extract_node_tools(node)
        if (tools & HIGH_RISK_TOOLS) and node_id not in covered_ids:
            reasons.append(f"Node '{node_id}' uses high-risk tools but has no contract coverage")

    # 2. At least one escalate_when rule across all contracts
    has_escalation = False
    for c in contracts:
        rules = c.get("rules", {})
        if rules.get("escalate_when"):
            has_escalation = True
            break
    if not has_escalation:
        reasons.append("No escalate_when rules found across any contract")

    # 3. No needs_human_review findings unresolved
    if findings:
        needs_review = [f for f in findings if f.get("status") == "needs_human_review"]
        if needs_review:
            reasons.append(f"{len(needs_review)} finding(s) still marked needs_human_review")

    return (len(reasons) == 0, reasons)
