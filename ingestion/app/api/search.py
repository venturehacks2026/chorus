from fastapi import APIRouter
from pydantic import BaseModel

from app.db.client import get_supabase
from app.llm.client import embed_texts

router = APIRouter(prefix="/api/v1/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    sop_id: str | None = None
    match_threshold: float = 0.7
    match_count: int = 10


@router.post("/chunks")
async def search_chunks(body: SearchRequest):
    # Embed the query
    query_embedding = embed_texts([body.query])[0]

    db = get_supabase()

    # Call the match_chunks RPC function
    params = {
        "query_embedding": query_embedding,
        "match_threshold": body.match_threshold,
        "match_count": body.match_count,
    }
    if body.sop_id:
        params["filter_sop_id"] = body.sop_id

    result = db.rpc("match_chunks", params).execute()

    return {
        "query": body.query,
        "results": result.data,
        "count": len(result.data) if result.data else 0,
    }
