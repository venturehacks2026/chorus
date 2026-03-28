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
        file_bytes=file_bytes,
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


@router.get("")
async def list_sops():
    db = get_supabase()
    result = db.table("sop_documents").select("id, title, source_type, created_at, updated_at").order("created_at", desc=True).execute()
    return result.data
