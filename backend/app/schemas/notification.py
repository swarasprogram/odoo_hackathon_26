from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    user_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
