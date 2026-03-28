import uuid
from datetime import datetime

from pydantic import BaseModel

from app.db.enums import SourceType


class SOPCreate(BaseModel):
    title: str
    source_type: SourceType = SourceType.text
    content: str
    source_uri: str | None = None
    metadata: dict | None = None


class SOPResponse(BaseModel):
    id: uuid.UUID
    title: str
    source_type: SourceType
    source_uri: str | None
    content_hash: str
    chunk_count: int = 0
    metadata: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SOPListResponse(BaseModel):
    id: uuid.UUID
    title: str
    source_type: SourceType
    status: str | None = None
    chunk_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ConfluenceIngest(BaseModel):
    url: str
    title: str | None = None


class NotionIngest(BaseModel):
    page_id: str
    title: str | None = None
