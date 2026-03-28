"""YAML DSL parser, serializer, and schema validator for behavioral contracts."""

import logging
from typing import Any

import yaml

logger = logging.getLogger(__name__)

VALID_SEVERITIES = {"critical", "high", "medium", "low"}
VALID_VIOLATION_ACTIONS = {"BLOCK", "ESCALATE", "LOG"}

# Severity → default violation action mapping
SEVERITY_ACTION_MAP: dict[str, str] = {
    "critical": "BLOCK",
    "high": "BLOCK",
    "medium": "ESCALATE",
    "low": "LOG",
}

REQUIRED_CONTRACT_FIELDS = {"name", "summary", "severity", "rules"}
REQUIRED_RULE_FIELDS = {"id", "condition", "action"}
REQUIRED_ESCALATION_FIELDS = {"id", "condition", "escalate_to", "message"}


def parse_yaml(yaml_str: str) -> dict:
    """Parse a YAML DSL contract string into a dict.

    Returns the inner 'contract' dict if wrapped, otherwise the raw parsed dict.
    """
    doc = yaml.safe_load(yaml_str)
    if doc is None:
        raise ValueError("Empty YAML document")
    if isinstance(doc, dict) and "contract" in doc:
        return doc["contract"]
    return doc


def serialize_yaml(contract: dict) -> str:
    """Serialize a contract dict back to YAML DSL format."""
    return yaml.dump(
        {"contract": contract},
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
    )


def validate_contract(contract: dict) -> list[str]:
    """Validate a parsed contract dict against the DSL schema.

    Returns a list of error strings. Empty list means valid.
    """
    errors: list[str] = []
    name = contract.get("name", "<unnamed>")

    # Required top-level fields
    for field in REQUIRED_CONTRACT_FIELDS:
        if field not in contract:
            errors.append(f"Contract '{name}': missing required field '{field}'")

    # Severity
    severity = contract.get("severity")
    if severity and severity not in VALID_SEVERITIES:
        errors.append(f"Contract '{name}': invalid severity '{severity}'")

    # on_violation
    on_violation = contract.get("on_violation")
    if on_violation:
        action = on_violation.get("action")
        if action and action not in VALID_VIOLATION_ACTIONS:
            errors.append(f"Contract '{name}': invalid violation action '{action}'")

    # Rules
    rules = contract.get("rules", {})
    if not isinstance(rules, dict):
        errors.append(f"Contract '{name}': 'rules' must be a mapping")
        return errors

    for rule_type in ("must_always", "must_never"):
        for rule in rules.get(rule_type, []):
            _validate_rule(rule, name, rule_type, errors)

    for rule in rules.get("escalate_when", []):
        _validate_escalation(rule, name, errors)

    return errors


def _validate_rule(rule: dict, contract_name: str, rule_type: str, errors: list[str]) -> None:
    rid = rule.get("id", "?")
    for field in REQUIRED_RULE_FIELDS:
        if field not in rule:
            errors.append(
                f"Contract '{contract_name}' {rule_type} rule '{rid}': missing '{field}'"
            )


def _validate_escalation(rule: dict, contract_name: str, errors: list[str]) -> None:
    rid = rule.get("id", "?")
    for field in REQUIRED_ESCALATION_FIELDS:
        if field not in rule:
            errors.append(
                f"Contract '{contract_name}' escalate_when rule '{rid}': missing '{field}'"
            )


def parse_and_validate(yaml_str: str) -> tuple[dict | None, list[str]]:
    """Parse YAML and validate in one step.

    Returns (contract_dict, errors). If parsing fails, contract_dict is None.
    """
    try:
        contract = parse_yaml(yaml_str)
    except Exception as e:
        return None, [f"YAML parse error: {e}"]

    errors = validate_contract(contract)
    return contract, errors


def get_all_rule_ids(contract: dict) -> list[str]:
    """Extract all rule IDs from a contract."""
    ids: list[str] = []
    rules = contract.get("rules", {})
    for rule_type in ("must_always", "must_never", "escalate_when"):
        for rule in rules.get(rule_type, []):
            if "id" in rule:
                ids.append(rule["id"])
    return ids


def get_scope_node_ids(contract: dict) -> list[str]:
    """Extract scope_node_ids from a contract, defaulting to empty list."""
    return contract.get("scope_node_ids", []) or []
