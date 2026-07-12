import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class MaintenanceStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"


class MaintenancePriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    raised_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SAEnum(MaintenancePriority), default=MaintenancePriority.medium, nullable=False)
    status = Column(SAEnum(MaintenanceStatus), default=MaintenanceStatus.pending, nullable=False)
    photo_url = Column(String(500), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    technician_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    technician_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    estimated_cost = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    image_url = Column(String(500), nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_requests")
    raised_by_user = relationship("User", back_populates="maintenance_requests", foreign_keys=[raised_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    technician = relationship("User", foreign_keys=[technician_id])
