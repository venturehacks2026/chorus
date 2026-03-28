from app.llm.client import embed_texts
from app.ingestion.chunker import Chunk


def embed_chunks(chunks: list[Chunk]) -> list[list[float]]:
    texts = [chunk.content for chunk in chunks]
    if not texts:
        return []
    return embed_texts(texts)
