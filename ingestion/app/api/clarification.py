from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.client import get_supabase
from app.schemas.clarification import ClarificationResolve

router = APIRouter(prefix="/api/v1/clarifications", tags=["clarifications"])


@router.get("/asd/{asd_id}")
async def list_clarifications(asd_id: str, status: str | None = None):
    db = get_supabase()
    query = db.table("clarification_requests").select("*").eq("asd_id", asd_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/{clarification_id}/resolve")
async def resolve_clarification(clarification_id: str, body: ClarificationResolve):
    db = get_supabase()

    # Verify clarification exists
    existing = db.table("clarification_requests").select("*").eq("id", clarification_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Clarification not found")

    if existing.data[0]["status"] != "pending":
        raise HTTPException(status_code=400, detail="Clarification is not pending")

    result = (
        db.table("clarification_requests")
        .update({
            "status": "resolved",
            "resolution": body.resolution,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", clarification_id)
        .execute()
    )

    return result.data[0] if result.data else {"status": "resolved"}
