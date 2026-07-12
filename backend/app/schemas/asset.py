from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from app.models.asset import AssetStatus, AssetCondition


class AssetBase(BaseModel):
    name: str
    serial_number: Optional[str] = None
    category_id: UUID
    department_id: Optional[UUID] = None
    acquisition_date: Optional[datetime] = None
    acquisition_cost: Optional[Decimal] = None
    condition: Optional[AssetCondition] = AssetCondition.good
    location: Optional[str] = None
    description: Optional[str] = None
    is_bookable: bool = False
    image_url: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    serial_number: Optional[str] = None
    category_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    acquisition_date: Optional[datetime] = None
    acquisition_cost: Optional[Decimal] = None
    condition: Optional[AssetCondition] = None
    status: Optional[AssetStatus] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_bookable: Optional[bool] = None
    image_url: Optional[str] = None


class AssetOut(AssetBase):
    id: UUID
    asset_tag: str
    status: AssetStatus
    photo_url: Optional[str] = None
    registered_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    category_name: Optional[str] = None
    department_name: Optional[str] = None
    current_holder: Optional[str] = None

    class Config:
        from_attributes = True


class AssetListOut(BaseModel):
    items: List[AssetOut]
    total: int
    page: int
    size: int
