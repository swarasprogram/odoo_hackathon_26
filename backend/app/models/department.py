import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    head_id = Column(UUID(as_uuid=True), ForeignKey("users.id", use_alter=True), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    head = relationship("User", foreign_keys=[head_id])
    parent = relationship("Department", remote_side="Department.id", foreign_keys=[parent_id])
    children = relationship("Department", back_populates="parent", foreign_keys=[parent_id])
    employees = relationship("User", back_populates="department", foreign_keys="User.department_id")
    assets = relationship("Asset", back_populates="department")


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    warranty_period_months = Column(String(50), nullable=True)
    custom_fields = Column(Text, nullable=True)  # JSON string for extra fields
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assets = relationship("Asset", back_populates="category")
