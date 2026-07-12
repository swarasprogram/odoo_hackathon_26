import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class NotificationType(str, enum.Enum):
    asset_assigned = "asset_assigned"
    asset_returned = "asset_returned"
    maintenance_approved = "maintenance_approved"
    maintenance_rejected = "maintenance_rejected"
    maintenance_resolved = "maintenance_resolved"
    booking_confirmed = "booking_confirmed"
    booking_cancelled = "booking_cancelled"
    booking_reminder = "booking_reminder"
    transfer_approved = "transfer_approved"
    transfer_rejected = "transfer_rejected"
    overdue_return = "overdue_return"
    audit_discrepancy = "audit_discrepancy"
    general = "general"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(NotificationType), default=NotificationType.general)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)  # asset, booking, maintenance, etc.
    entity_id = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)  # JSON string
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
