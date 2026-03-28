"""Pydantic models for the contract generation API."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.db.enums import ContractSeverity, ContractStatus, FindingStatus, FindingType


class ContractResponse(BaseModel):
    id: uuid.UUID
    asd_id: uuid.UUID
    contract_name: str
    contract_type: str
    description: str
    source_text: str | None = None
    scope_node_ids: list | None = None
    severity: ContractSeverity | None = None
    dsl_yaml: str | None = None
    on_violation: dict | None = None
    status: ContractStatus
    generation_run_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class FindingResponse(BaseModel):
    id: uuid.UUID
    asd_id: uuid.UUID
    generation_run_id: uuid.UUID
    contract_id: uuid.UUID | None = None
    finding_type: FindingType
    severity: str
    description: str
    details: dict = {}
    status: FindingStatus
    resolution: str | None = None
    resolved_at: datetime | None = None
    loop_iteration: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ContractGenRunResponse(BaseModel):
    id: uuid.UUID
    asd_id: uuid.UUID
    status: str
    current_agent: str | None = None
    loop_count: int = 0
    error: str | None = None
    started_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class ActivationGateResponse(BaseModel):
    can_activate: bool
    reasons: list[str] = []


class ContractListResponse(BaseModel):
    contracts: list[ContractResponse]
    findings: list[FindingResponse]
    latest_run: ContractGenRunResponse | None = None
    activation_gate: ActivationGateResponse | None = None


class ContractEditRequest(BaseModel):
    dsl_yaml: str


class ContractDismissRequest(BaseModel):
    reason: str


class GenerateRequest(BaseModel):
    force: bool = False
