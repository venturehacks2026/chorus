import json
import logging
from pathlib import Path

from jinja2 import Template

from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "edge_build.j2"


def build_edges(nodes: list[dict]) -> tuple[list[dict], list[dict]]:
    template = Template(PROMPT_PATH.read_text())
    prompt = template.render(nodes_json=json.dumps(nodes, indent=2))

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are a graph construction expert. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
    )

    edges = result.get("edges", [])
    added_nodes = result.get("added_nodes", [])

    logger.info(f"Edge construction produced {len(edges)} edges, {len(added_nodes)} additional nodes")
    return edges, added_nodes
