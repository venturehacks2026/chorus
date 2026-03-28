import logging
from pathlib import Path

from jinja2 import Template

from app.llm.client import chat_completion_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent / "prompts" / "contract_extract.j2"


def extract_contracts(sop_text: str) -> list[dict]:
    template = Template(PROMPT_PATH.read_text())
    prompt = template.render(sop_text=sop_text)

    result = chat_completion_json(
        messages=[
            {"role": "system", "content": "You are a compliance analysis expert. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
    )

    contracts = result.get("contracts", [])
    logger.info(f"Contract extraction found {len(contracts)} contracts")
    return contracts
