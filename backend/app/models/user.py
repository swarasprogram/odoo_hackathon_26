import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    asset_manager = "asset_manager"
    department_head = "department_head"
    employee = "employee"


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.employee, nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.active, nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    allocations = relationship("Allocation", back_populates="employee", foreign_keys="Allocation.employee_id")
    bookings = relationship("ResourceBooking", back_populates="booked_by_user", foreign_keys="ResourceBooking.booked_by")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="raised_by_user", foreign_keys="MaintenanceRequest.raised_by")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
