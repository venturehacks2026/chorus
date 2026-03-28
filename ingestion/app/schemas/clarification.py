import uuid
from datetime import datetime

from pydantic import BaseModel

from app.db.enums import ClarificationStatus


class ClarificationResponse(BaseModel):
    id: uuid.UUID
    asd_id: uuid.UUID
    node_id: str | None
    question: str
    context: str | None
    status: ClarificationStatus
    resolution: str | None
    resolved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClarificationResolve(BaseModel):
    resolution: str
