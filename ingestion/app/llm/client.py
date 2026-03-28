import json
import logging

import tiktoken
from openai import AzureOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client: AzureOpenAI | None = None


def get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
    return _client


def chat_completion(
    messages: list[dict],
    response_format: dict | None = None,
    temperature: float = 0.2,
    max_retries: int = 3,
) -> str:
    client = get_client()
    kwargs = {
        "model": settings.azure_openai_chat_deployment,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Chat completion attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                raise
    return ""


def chat_completion_json(
    messages: list[dict],
    temperature: float = 0.2,
    max_retries: int = 3,
) -> dict | list:
    raw = chat_completion(
        messages=messages,
        response_format={"type": "json_object"},
        temperature=temperature,
        max_retries=max_retries,
    )
    for attempt in range(max_retries):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning(f"JSON parse attempt {attempt + 1} failed, retrying...")
            if attempt < max_retries - 1:
                raw = chat_completion(
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    max_retries=1,
                )
            else:
                raise


def embed_texts(texts: list[str]) -> list[list[float]]:
    client = get_client()
    all_embeddings = []
    batch_size = settings.embedding_batch_size

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(
            model=settings.azure_openai_embedding_deployment,
            input=batch,
        )
        all_embeddings.extend([item.embedding for item in response.data])

    return all_embeddings


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))
