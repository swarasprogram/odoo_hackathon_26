from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.allocation import AllocationStatus, TransferStatus


class AllocationCreate(BaseModel):
    asset_id: UUID
    employee_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None


class AllocationReturn(BaseModel):
    condition_check_in_notes: Optional[str] = None


class AllocationOut(BaseModel):
    id: UUID
    asset_id: UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    employee_id: Optional[UUID] = None
    employee_name: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    allocated_by: UUID
    allocated_by_name: Optional[str] = None
    allocated_at: datetime
    expected_return_date: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    condition_check_in_notes: Optional[str] = None
    notes: Optional[str] = None
    status: AllocationStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TransferCreate(BaseModel):
    asset_id: UUID
    to_user_id: Optional[UUID] = None
    to_department_id: Optional[UUID] = None
    notes: Optional[str] = None


class TransferAction(BaseModel):
    rejection_reason: Optional[str] = None


class TransferOut(BaseModel):
    id: UUID
    asset_id: UUID
    asset_tag: Optional[str] = None
    asset_name: Optional[str] = None
    from_user_id: Optional[UUID] = None
    from_user_name: Optional[str] = None
    to_user_id: Optional[UUID] = None
    to_user_name: Optional[str] = None
    to_department_id: Optional[UUID] = None
    to_department_name: Optional[str] = None
    requested_by: UUID
    requested_by_name: Optional[str] = None
    status: TransferStatus
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
