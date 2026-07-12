from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.maintenance import MaintenanceStatus, MaintenancePriority


class MaintenanceCreate(BaseModel):
    asset_id: UUID
    description: str
    priority: MaintenancePriority = MaintenancePriority.medium
    image_url: Optional[str] = None


class MaintenanceApprove(BaseModel):
    technician_id: Optional[UUID] = None


class MaintenanceReject(BaseModel):
    rejection_reason: str


class MaintenanceAssign(BaseModel):
    technician_id: UUID


class MaintenanceResolve(BaseModel):
    technician_notes: Optional[str] = None
    estimated_cost: Optional[str] = None


class MaintenanceOut(BaseModel):
    id: UUID
    asset_id: UUID
    asset_name: Optional[str] = None
    asset_tag: Optional[str] = None
    raised_by: UUID
    raised_by_name: Optional[str] = None
    description: str
    priority: MaintenancePriority
    status: MaintenanceStatus
    photo_url: Optional[str] = None
    approved_by: Optional[UUID] = None
    approved_by_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    technician_id: Optional[UUID] = None
    technician_name: Optional[str] = None
    technician_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    estimated_cost: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    image_url: Optional[str] = None

    class Config:
        from_attributes = True
