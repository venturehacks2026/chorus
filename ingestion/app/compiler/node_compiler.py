import json
import logging
from pathlib import Path

from jinja2 import Template

from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "node_compile.j2"


def compile_nodes(steps: list[dict]) -> tuple[list[dict], list[dict]]:
    template = Template(PROMPT_PATH.read_text())
    prompt = template.render(steps_json=json.dumps(steps, indent=2))

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are an ASD node compiler. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
    )

    nodes = result.get("nodes", [])
    clarifications = result.get("clarifications", [])

    logger.info(f"Node compilation produced {len(nodes)} nodes, {len(clarifications)} clarifications")
    return nodes, clarifications
