import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey, Text, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AuditCycleStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class AuditItemStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    missing = "missing"
    damaged = "damaged"


class AuditScopeType(str, enum.Enum):
    department = "department"
    location = "location"
    all = "all"


# Association table for auditors
audit_auditors = Table(
    "audit_auditors",
    Base.metadata,
    Column("cycle_id", UUID(as_uuid=True), ForeignKey("audit_cycles.id")),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id")),
)


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    scope_type = Column(SAEnum(AuditScopeType), default=AuditScopeType.all, nullable=False)
    scope_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    scope_location = Column(String(255), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(SAEnum(AuditCycleStatus), default=AuditCycleStatus.active, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    closed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scope_department = relationship("Department", foreign_keys=[scope_department_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    closed_by_user = relationship("User", foreign_keys=[closed_by])
    auditors = relationship("User", secondary=audit_auditors)
    items = relationship("AuditItem", back_populates="cycle")


class AuditItem(Base):
    __tablename__ = "audit_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id = Column(UUID(as_uuid=True), ForeignKey("audit_cycles.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    auditor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(SAEnum(AuditItemStatus), default=AuditItemStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    cycle = relationship("AuditCycle", back_populates="items")
    asset = relationship("Asset", back_populates="audit_items")
    auditor = relationship("User", foreign_keys=[auditor_id])
