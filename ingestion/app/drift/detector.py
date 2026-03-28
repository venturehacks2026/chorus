import hashlib
import logging

from fastapi import APIRouter, HTTPException

from app.db.client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/drift", tags=["drift"])


def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


@router.post("/check/{sop_id}")
async def check_drift(sop_id: str):
    db = get_supabase()

    sop_result = db.table("sop_documents").select("*").eq("id", sop_id).execute()
    if not sop_result.data:
        raise HTTPException(status_code=404, detail="SOP not found")

    sop = sop_result.data[0]
    stored_hash = sop["content_hash"]
    current_hash = compute_hash(sop["raw_text"])

    # Check if any ASD is linked to this SOP
    asd_result = (
        db.table("agent_skill_documents")
        .select("id, skill_id, status, current_version")
        .eq("sop_id", sop_id)
        .execute()
    )

    drift_detected = stored_hash != current_hash

    if drift_detected and asd_result.data:
        # Mark all linked ASDs as needing recompilation
        for asd in asd_result.data:
            db.table("agent_skill_documents").update({
                "status": "needs_recompile",
            }).eq("id", asd["id"]).execute()

    return {
        "sop_id": sop_id,
        "drift_detected": drift_detected,
        "stored_hash": stored_hash,
        "current_hash": current_hash,
        "affected_asds": [
            {"id": a["id"], "skill_id": a["skill_id"], "status": "needs_recompile" if drift_detected else a["status"]}
            for a in (asd_result.data or [])
        ],
    }


@router.post("/recheck/{sop_id}")
async def recheck_with_new_content(sop_id: str, new_raw_text: str):
    db = get_supabase()

    sop_result = db.table("sop_documents").select("*").eq("id", sop_id).execute()
    if not sop_result.data:
        raise HTTPException(status_code=404, detail="SOP not found")

    sop = sop_result.data[0]
    old_hash = sop["content_hash"]
    new_hash = compute_hash(new_raw_text)
    drift_detected = old_hash != new_hash

    if drift_detected:
        # Update the SOP with new content and hash
        db.table("sop_documents").update({
            "raw_text": new_raw_text,
            "content_hash": new_hash,
        }).eq("id", sop_id).execute()

        # Mark ASDs for recompilation
        asd_result = (
            db.table("agent_skill_documents")
            .select("id")
            .eq("sop_id", sop_id)
            .execute()
        )
        for asd in (asd_result.data or []):
            db.table("agent_skill_documents").update({
                "status": "needs_recompile",
            }).eq("id", asd["id"]).execute()

    return {
        "sop_id": sop_id,
        "drift_detected": drift_detected,
        "old_hash": old_hash,
        "new_hash": new_hash,
    }
