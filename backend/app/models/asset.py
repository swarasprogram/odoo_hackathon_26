import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AssetStatus(str, enum.Enum):
    available = "available"
    allocated = "allocated"
    reserved = "reserved"
    under_maintenance = "under_maintenance"
    lost = "lost"
    retired = "retired"
    disposed = "disposed"


class AssetCondition(str, enum.Enum):
    excellent = "excellent"
    good = "good"
    fair = "fair"
    poor = "poor"
    damaged = "damaged"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    asset_tag = Column(String(50), unique=True, nullable=False, index=True)
    serial_number = Column(String(255), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    acquisition_date = Column(DateTime, nullable=True)
    acquisition_cost = Column(Numeric(12, 2), nullable=True)
    condition = Column(SAEnum(AssetCondition), default=AssetCondition.good)
    status = Column(SAEnum(AssetStatus), default=AssetStatus.available, nullable=False)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    documents = Column(Text, nullable=True)  # JSON list of doc URLs
    is_bookable = Column(Boolean, default=False)
    registered_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("AssetCategory", back_populates="assets")
    department = relationship("Department", back_populates="assets")
    registered_by_user = relationship("User", foreign_keys=[registered_by])
    allocations = relationship("Allocation", back_populates="asset")
    bookings = relationship("ResourceBooking", back_populates="asset")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="asset")
    audit_items = relationship("AuditItem", back_populates="asset")
