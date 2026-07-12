import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class AllocationStatus(str, enum.Enum):
    active = "active"
    returned = "returned"
    overdue = "overdue"


class TransferStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    allocated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    allocated_at = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    condition_check_in_notes = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(SAEnum(AllocationStatus), default=AllocationStatus.active, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="allocations")
    employee = relationship("User", back_populates="allocations", foreign_keys=[employee_id])
    allocated_by_user = relationship("User", foreign_keys=[allocated_by])
    department = relationship("Department", foreign_keys=[department_id])


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    to_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(SAEnum(TransferStatus), default=TransferStatus.pending, nullable=False)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", foreign_keys=[asset_id])
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    requested_by_user = relationship("User", foreign_keys=[requested_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    to_department = relationship("Department", foreign_keys=[to_department_id])
