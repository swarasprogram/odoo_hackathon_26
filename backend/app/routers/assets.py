from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.allocation import Allocation, AllocationStatus
from app.models.department import AssetCategory, Department
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetUpdate, AssetOut
from app.dependencies import get_current_user, require_asset_manager_or_admin
from app.services.notification import log_activity

router = APIRouter(prefix="/api/assets", tags=["assets"])


def _asset_tag(db: Session) -> str:
    count = db.query(Asset).count()
    return f"AF-{(count + 1):04d}"


def _enrich_asset(asset: Asset, db: Session) -> AssetOut:
    cat_name = asset.category.name if asset.category else None
    dept_name = asset.department.name if asset.department else None
    # Find current holder
    active_alloc = db.query(Allocation).filter(
        Allocation.asset_id == asset.id,
        Allocation.status == AllocationStatus.active
    ).first()
    current_holder = None
    if active_alloc and active_alloc.employee:
        current_holder = active_alloc.employee.name
    elif active_alloc and active_alloc.department:
        current_holder = f"Dept: {active_alloc.department.name}"

    return AssetOut(
        id=asset.id, name=asset.name, asset_tag=asset.asset_tag,
        serial_number=asset.serial_number, category_id=asset.category_id,
        department_id=asset.department_id, acquisition_date=asset.acquisition_date,
        acquisition_cost=asset.acquisition_cost, condition=asset.condition,
        status=asset.status, location=asset.location, description=asset.description,
        photo_url=asset.photo_url, is_bookable=asset.is_bookable,
        registered_by=asset.registered_by, created_at=asset.created_at,
        updated_at=asset.updated_at, category_name=cat_name,
        department_name=dept_name, current_holder=current_holder,
    )


@router.get("", response_model=List[AssetOut])
def list_assets(
    search: Optional[str] = Query(None),
    status: Optional[AssetStatus] = Query(None),
    category_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    location: Optional[str] = Query(None),
    is_bookable: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Asset)
    if search:
        q = q.filter(or_(Asset.name.ilike(f"%{search}%"), Asset.asset_tag.ilike(f"%{search}%"), Asset.serial_number.ilike(f"%{search}%")))
    if status:
        q = q.filter(Asset.status == status)
    if category_id:
        q = q.filter(Asset.category_id == category_id)
    if department_id:
        q = q.filter(Asset.department_id == department_id)
    if location:
        q = q.filter(Asset.location.ilike(f"%{location}%"))
    if is_bookable is not None:
        q = q.filter(Asset.is_bookable == is_bookable)
    assets = q.all()
    return [_enrich_asset(a, db) for a in assets]


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(data: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    cat = db.query(AssetCategory).filter(AssetCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    asset = Asset(**data.model_dump(), asset_tag=_asset_tag(db), registered_by=current_user.id)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    log_activity(db, current_user.id, f"Registered asset {asset.asset_tag}", "asset", asset.id)
    db.commit()
    return _enrich_asset(asset, db)


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return _enrich_asset(asset, db)


@router.put("/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: UUID, data: AssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(asset, field, val)
    db.commit()
    db.refresh(asset)
    log_activity(db, current_user.id, f"Updated asset {asset.asset_tag}", "asset", asset.id)
    db.commit()
    return _enrich_asset(asset, db)


@router.get("/{asset_id}/history")
def get_asset_history(asset_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.allocation import Allocation
    from app.models.maintenance import MaintenanceRequest
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    allocations = db.query(Allocation).filter(Allocation.asset_id == asset_id).order_by(Allocation.allocated_at.desc()).all()
    maintenance = db.query(MaintenanceRequest).filter(MaintenanceRequest.asset_id == asset_id).order_by(MaintenanceRequest.created_at.desc()).all()
    return {
        "asset": _enrich_asset(asset, db),
        "allocations": [{"id": str(a.id), "employee": a.employee.name if a.employee else None,
                          "department": a.department.name if a.department else None,
                          "allocated_at": a.allocated_at, "returned_at": a.returned_at,
                          "status": a.status, "notes": a.notes} for a in allocations],
        "maintenance": [{"id": str(m.id), "description": m.description, "status": m.status,
                          "priority": m.priority, "created_at": m.created_at, "resolved_at": m.resolved_at} for m in maintenance],
    }
