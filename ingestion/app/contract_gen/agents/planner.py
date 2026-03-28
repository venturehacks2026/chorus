"""Agent 1 — Planner: Analyzes SOP + ASD for risk surface and rule candidates."""

import json
import logging
from pathlib import Path

from jinja2 import Template

from app.contract_gen.state import ContractGenState
from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "planner.j2"


def run_planner(state: ContractGenState) -> ContractGenState:
    """Analyze SOP and ASD nodes to identify risks and rule candidates."""
    state.current_agent = "planner"
    logger.info(f"[{state.run_id}] Running planner for ASD {state.asd_id}")

    template = Template(_PROMPT_PATH.read_text())
    prompt = template.render(
        sop_text=state.sop_text,
        asd_nodes_json=json.dumps(state.asd_nodes, indent=2),
    )

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are a risk analysis specialist for AI agent behavioral contracts."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    state.risk_surface = result.get("risk_surface", [])
    state.rule_candidates = result.get("rule_candidates", [])
    state.escalation_points = result.get("escalation_points", [])
    state.coverage_notes = result.get("coverage_notes", "")

    logger.info(
        f"[{state.run_id}] Planner found {len(state.risk_surface)} risks, "
        f"{len(state.rule_candidates)} rule candidates, "
        f"{len(state.escalation_points)} escalation points"
    )

    return state
