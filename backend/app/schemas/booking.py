from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    asset_id: UUID
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    department_id: Optional[UUID] = None


class BookingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class BookingCancel(BaseModel):
    cancellation_reason: Optional[str] = None


class BookingOut(BaseModel):
    id: UUID
    asset_id: UUID
    asset_name: Optional[str] = None
    asset_tag: Optional[str] = None
    booked_by: UUID
    booked_by_name: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: BookingStatus
    cancellation_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AutoSuggestRequest(BaseModel):
    asset_id: UUID
    duration_minutes: int
    preference: str

class SuggestedSlot(BaseModel):
    start_time: datetime
    end_time: datetime
