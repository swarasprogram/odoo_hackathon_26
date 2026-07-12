from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.audit import AuditCycleStatus, AuditItemStatus, AuditScopeType


class AuditCycleCreate(BaseModel):
    name: str
    scope_type: AuditScopeType = AuditScopeType.all
    scope_department_id: Optional[UUID] = None
    scope_location: Optional[str] = None
    start_date: datetime
    end_date: datetime
    auditor_ids: List[UUID] = []
    notes: Optional[str] = None


class AuditItemUpdate(BaseModel):
    status: AuditItemStatus
    notes: Optional[str] = None


class AuditItemOut(BaseModel):
    id: UUID
    cycle_id: UUID
    asset_id: UUID
    asset_name: Optional[str] = None
    asset_tag: Optional[str] = None
    asset_location: Optional[str] = None
    auditor_id: Optional[UUID] = None
    auditor_name: Optional[str] = None
    status: AuditItemStatus
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditCycleOut(BaseModel):
    id: UUID
    name: str
    scope_type: AuditScopeType
    scope_department_id: Optional[UUID] = None
    scope_department_name: Optional[str] = None
    scope_location: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: AuditCycleStatus
    created_by: UUID
    created_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    auditor_names: Optional[List[str]] = []
    total_items: Optional[int] = 0
    verified_count: Optional[int] = 0
    missing_count: Optional[int] = 0
    damaged_count: Optional[int] = 0

    class Config:
        from_attributes = True
