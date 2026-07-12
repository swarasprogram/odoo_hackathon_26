from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    head_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentBase):
    id: UUID
    created_at: datetime
    head_name: Optional[str] = None
    employee_count: Optional[int] = 0

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    warranty_period_months: Optional[str] = None
    custom_fields: Optional[str] = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    warranty_period_months: Optional[str] = None
    custom_fields: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryOut(CategoryBase):
    id: UUID
    created_at: datetime
    asset_count: Optional[int] = 0

    class Config:
        from_attributes = True
