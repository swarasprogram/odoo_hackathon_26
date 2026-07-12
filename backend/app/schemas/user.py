from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole, UserStatus


class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: Optional[UUID] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None


class UserOut(UserBase):
    id: UUID
    role: UserRole
    status: UserStatus
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserOutWithDept(UserOut):
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
