import hashlib
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db.client import get_supabase
from app.ingestion.chunker import chunk_document
from app.ingestion.embedder import embed_chunks
from app.ingestion.parser import parse_document
from app.schemas.sop import ConfluenceIngest, NotionIngest, SOPCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/sops", tags=["sops"])


@router.post("/upload")
async def upload_sop(
    file: UploadFile = File(...),
    title: str = Form(""),
):
    file_bytes = await file.read()
    filename = file.filename or ""

    if filename.lower().endswith(".pdf"):
        source_type = "pdf"
    elif filename.lower().endswith((".docx", ".doc")):
        source_type = "docx"
    else:
        source_type = "text"

    parsed = parse_document(
        file_bytes=file_bytes if source_type != "text" else None,
        text_content=file_bytes.decode("utf-8") if source_type == "text" else None,
        filename=filename,
        source_type=source_type,
        title=title or filename,
    )

    content_hash = hashlib.sha256(parsed.raw_text.encode()).hexdigest()
    sop_id = str(uuid.uuid4())

    db = get_supabase()

    # Insert SOP document
    sop_data = {
        "id": sop_id,
        "title": title or parsed.title,
        "source_type": source_type,
        "source_uri": filename,
        "content_hash": content_hash,
        "raw_text": parsed.raw_text,
        "metadata": parsed.metadata,
    }
    result = db.table("sop_documents").insert(sop_data).execute()

    # Chunk and embed
    chunks = chunk_document(parsed)
    embeddings = embed_chunks(chunks)

    # Insert chunks with embeddings
    chunk_rows = []
    for chunk, embedding in zip(chunks, embeddings):
        chunk_rows.append({
            "id": str(uuid.uuid4()),
            "sop_id": sop_id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "embedding": embedding,
            "structural_metadata": chunk.structural_metadata,
            "start_offset": chunk.start_offset,
            "end_offset": chunk.end_offset,
        })

    if chunk_rows:
        db.table("document_chunks").insert(chunk_rows).execute()

    return {
        "id": sop_id,
        "title": title or parsed.title,
        "source_type": source_type,
        "content_hash": content_hash,
        "chunk_count": len(chunks),
        "message": "SOP uploaded and processed successfully",
    }


@router.post("/text")
async def ingest_text(body: SOPCreate):
    parsed = parse_document(
        text_content=body.content,
        source_type="text",
        title=body.title,
    )

    content_hash = hashlib.sha256(parsed.raw_text.encode()).hexdigest()
    sop_id = str(uuid.uuid4())

    db = get_supabase()

    sop_data = {
        "id": sop_id,
        "title": body.title,
        "source_type": "text",
        "source_uri": body.source_uri,
        "content_hash": content_hash,
        "raw_text": parsed.raw_text,
        "metadata": body.metadata or parsed.metadata,
    }
    db.table("sop_documents").insert(sop_data).execute()

    chunks = chunk_document(parsed)
    embeddings = embed_chunks(chunks)

    chunk_rows = []
    for chunk, embedding in zip(chunks, embeddings):
        chunk_rows.append({
            "id": str(uuid.uuid4()),
            "sop_id": sop_id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "embedding": embedding,
            "structural_metadata": chunk.structural_metadata,
            "start_offset": chunk.start_offset,
            "end_offset": chunk.end_offset,
        })

    if chunk_rows:
        db.table("document_chunks").insert(chunk_rows).execute()

    return {
        "id": sop_id,
        "title": body.title,
        "source_type": "text",
        "content_hash": content_hash,
        "chunk_count": len(chunks),
        "message": "SOP text ingested and processed successfully",
    }


@router.get("/{sop_id}")
async def get_sop(sop_id: str):
    db = get_supabase()
    result = db.table("sop_documents").select("*").eq("id", sop_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="SOP not found")

    sop = result.data[0]

    # Get chunk count
    chunks = db.table("document_chunks").select("id", count="exact").eq("sop_id", sop_id).execute()
    sop["chunk_count"] = chunks.count or 0

    return sop


@router.delete("/{sop_id}")
async def delete_sop(sop_id: str):
    db = get_supabase()
    result = db.table("sop_documents").select("id").eq("id", sop_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="SOP not found")

    # Find associated ASDs to cascade-delete their children
    asds = db.table("agent_skill_documents").select("id").eq("sop_id", sop_id).execute()
    for asd in (asds.data or []):
        asd_id = asd["id"]

        # Delete contracts for this ASD
        db.table("derived_contracts").delete().eq("asd_id", asd_id).execute()

        # Delete clarification requests for this ASD
        db.table("clarification_requests").delete().eq("asd_id", asd_id).execute()

        # Delete nodes and edges for all versions of this ASD
        versions = db.table("asd_versions").select("id").eq("asd_id", asd_id).execute()
        for ver in (versions.data or []):
            vid = ver["id"]
            db.table("asd_nodes").delete().eq("asd_version_id", vid).execute()
            db.table("asd_edges").delete().eq("asd_version_id", vid).execute()

        # Delete versions
        db.table("asd_versions").delete().eq("asd_id", asd_id).execute()

    # Delete ASDs
    db.table("agent_skill_documents").delete().eq("sop_id", sop_id).execute()

    # Delete document chunks
    db.table("document_chunks").delete().eq("sop_id", sop_id).execute()

    # Delete the SOP itself
    db.table("sop_documents").delete().eq("id", sop_id).execute()

    return {"deleted": True, "sop_id": sop_id}


@router.get("")
async def list_sops():
    db = get_supabase()
    result = db.table("sop_documents").select("id, title, source_type, created_at, updated_at").order("created_at", desc=True).execute()
    return result.data
