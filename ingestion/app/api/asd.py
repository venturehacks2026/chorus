import logging

from fastapi import APIRouter, HTTPException

from app.db.client import get_supabase
from app.compiler.pipeline import compile_sop_to_asd
from app.schemas.asd import CompileRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/asds", tags=["asds"])


@router.post("/compile/{sop_id}", status_code=202)
async def compile_asd(sop_id: str, body: CompileRequest | None = None):
    db = get_supabase()

    # Verify SOP exists
    sop_result = db.table("sop_documents").select("*").eq("id", sop_id).execute()
    if not sop_result.data:
        raise HTTPException(status_code=404, detail="SOP not found")

    sop = sop_result.data[0]
    skill_id = body.skill_id if body and body.skill_id else None

    try:
        asd = compile_sop_to_asd(sop, skill_id=skill_id)
        return {
            "asd_id": asd["asd_id"],
            "skill_id": asd["skill_id"],
            "status": asd["status"],
            "node_count": asd["node_count"],
            "edge_count": asd["edge_count"],
            "automation_coverage_score": asd["automation_coverage_score"],
            "message": "ASD compiled successfully",
        }
    except Exception as e:
        logger.exception("ASD compilation failed")
        raise HTTPException(status_code=500, detail=f"Compilation failed: {str(e)}")


@router.get("/{asd_id}")
async def get_asd(asd_id: str):
    db = get_supabase()

    asd_result = db.table("agent_skill_documents").select("*").eq("id", asd_id).execute()
    if not asd_result.data:
        raise HTTPException(status_code=404, detail="ASD not found")

    asd = asd_result.data[0]

    # Get latest version with nodes and edges
    version_result = (
        db.table("asd_versions")
        .select("*")
        .eq("asd_id", asd_id)
        .eq("version", asd["current_version"])
        .execute()
    )

    if version_result.data:
        version = version_result.data[0]
        version_id = version["id"]

        nodes = db.table("asd_nodes").select("*").eq("asd_version_id", version_id).order("position_index").execute()
        edges = db.table("asd_edges").select("*").eq("asd_version_id", version_id).execute()

        asd["latest_version"] = {
            **version,
            "nodes": nodes.data,
            "edges": edges.data,
        }

    # Get contracts
    contracts = db.table("derived_contracts").select("*").eq("asd_id", asd_id).execute()
    asd["contracts"] = contracts.data

    return asd


@router.get("/{asd_id}/versions")
async def list_asd_versions(asd_id: str):
    db = get_supabase()
    result = db.table("asd_versions").select("*").eq("asd_id", asd_id).order("version", desc=True).execute()
    return result.data


@router.get("/{asd_id}/versions/{version}")
async def get_asd_version(asd_id: str, version: int):
    db = get_supabase()

    version_result = (
        db.table("asd_versions")
        .select("*")
        .eq("asd_id", asd_id)
        .eq("version", version)
        .execute()
    )
    if not version_result.data:
        raise HTTPException(status_code=404, detail="Version not found")

    ver = version_result.data[0]
    version_id = ver["id"]

    nodes = db.table("asd_nodes").select("*").eq("asd_version_id", version_id).order("position_index").execute()
    edges = db.table("asd_edges").select("*").eq("asd_version_id", version_id).execute()

    return {
        **ver,
        "nodes": nodes.data,
        "edges": edges.data,
    }


@router.get("")
async def list_asds():
    db = get_supabase()
    result = (
        db.table("agent_skill_documents")
        .select("id, skill_id, sop_id, description, status, current_version, automation_coverage_score, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data
