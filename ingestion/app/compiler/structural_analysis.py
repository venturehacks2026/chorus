import json
import logging
from pathlib import Path

from jinja2 import Template

from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "structural.j2"


def analyze_structure(sop_text: str, chunks_metadata: list[dict] | None = None) -> list[dict]:
    template = Template(PROMPT_PATH.read_text())
    prompt = template.render(
        sop_text=sop_text,
        chunks_metadata=chunks_metadata or [],
    )

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are an SOP analysis expert. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
    )

    steps = result.get("steps", [])
    logger.info(f"Structural analysis extracted {len(steps)} steps")
    return steps
