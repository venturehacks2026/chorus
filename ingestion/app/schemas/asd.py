import uuid
from datetime import datetime

from pydantic import BaseModel

from app.db.enums import ASDStatus, ContractStatus, ContractType, EdgeType, NodeType


class ASDNodeResponse(BaseModel):
    id: uuid.UUID
    node_id: str
    type: NodeType
    description: str | None
    config: dict | None
    source_chunk_id: uuid.UUID | None
    confidence_score: float | None
    needs_clarification: bool
    position_index: int

    model_config = {"from_attributes": True}


class ASDEdgeResponse(BaseModel):
    id: uuid.UUID
    from_node_id: str
    to_node_id: str
    edge_type: EdgeType
    condition_label: str | None

    model_config = {"from_attributes": True}


class ASDVersionResponse(BaseModel):
    id: uuid.UUID
    version: int
    sop_content_hash: str
    compiled_by: str | None
    nodes: list[ASDNodeResponse] = []
    edges: list[ASDEdgeResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ASDResponse(BaseModel):
    id: uuid.UUID
    skill_id: str
    sop_id: uuid.UUID
    current_version: int
    description: str | None
    preconditions: dict | None
    automation_gaps: list | None
    automation_coverage_score: float | None
    status: ASDStatus
    latest_version: ASDVersionResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ASDListResponse(BaseModel):
    id: uuid.UUID
    skill_id: str
    sop_id: uuid.UUID
    description: str | None
    status: ASDStatus
    current_version: int
    automation_coverage_score: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DerivedContractResponse(BaseModel):
    id: uuid.UUID
    asd_id: uuid.UUID
    contract_name: str
    contract_type: ContractType
    description: str
    source_text: str | None
    scope_node_ids: list | None
    status: ContractStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class CompileRequest(BaseModel):
    skill_id: str | None = None
