from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.audit import AuditCycle, AuditItem, AuditCycleStatus, AuditItemStatus, audit_auditors
from app.models.asset import Asset, AssetStatus
from app.models.user import User
from app.schemas.audit import AuditCycleCreate, AuditItemUpdate, AuditCycleOut, AuditItemOut
from app.dependencies import get_current_user, require_admin, require_asset_manager_or_admin
from app.services.notification import create_notification, log_activity
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/audits", tags=["audits"])


def _enrich_cycle(cycle: AuditCycle, db: Session) -> AuditCycleOut:
    total = len(cycle.items)
    verified = sum(1 for i in cycle.items if i.status == AuditItemStatus.verified)
    missing = sum(1 for i in cycle.items if i.status == AuditItemStatus.missing)
    damaged = sum(1 for i in cycle.items if i.status == AuditItemStatus.damaged)
    return AuditCycleOut(
        id=cycle.id, name=cycle.name, scope_type=cycle.scope_type,
        scope_department_id=cycle.scope_department_id,
        scope_department_name=cycle.scope_department.name if cycle.scope_department else None,
        scope_location=cycle.scope_location, start_date=cycle.start_date,
        end_date=cycle.end_date, status=cycle.status,
        created_by=cycle.created_by,
        created_by_name=cycle.created_by_user.name if cycle.created_by_user else None,
        notes=cycle.notes, created_at=cycle.created_at,
        auditor_names=[a.name for a in cycle.auditors],
        total_items=total, verified_count=verified,
        missing_count=missing, damaged_count=damaged,
    )


@router.get("", response_model=List[AuditCycleOut])
def list_audits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cycles = db.query(AuditCycle).order_by(AuditCycle.created_at.desc()).all()
    return [_enrich_cycle(c, db) for c in cycles]


@router.post("", response_model=AuditCycleOut, status_code=201)
def create_audit(data: AuditCycleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    cycle = AuditCycle(
        name=data.name, scope_type=data.scope_type,
        scope_department_id=data.scope_department_id,
        scope_location=data.scope_location, start_date=data.start_date,
        end_date=data.end_date, created_by=current_user.id, notes=data.notes,
    )
    db.add(cycle)
    db.flush()

    # Assign auditors
    for aid in data.auditor_ids:
        auditor = db.query(User).filter(User.id == aid).first()
        if auditor:
            cycle.auditors.append(auditor)

    # Populate audit items based on scope
    asset_query = db.query(Asset)
    if data.scope_type.value == "department" and data.scope_department_id:
        asset_query = asset_query.filter(Asset.department_id == data.scope_department_id)
    elif data.scope_type.value == "location" and data.scope_location:
        asset_query = asset_query.filter(Asset.location.ilike(f"%{data.scope_location}%"))
    assets = asset_query.all()

    for asset in assets:
        item = AuditItem(cycle_id=cycle.id, asset_id=asset.id, status=AuditItemStatus.pending)
        db.add(item)

    db.commit()
    db.refresh(cycle)
    log_activity(db, current_user.id, f"Created audit cycle {cycle.name}", "audit", cycle.id)
    db.commit()
    return _enrich_cycle(cycle, db)


@router.get("/{cycle_id}", response_model=AuditCycleOut)
def get_audit(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
    return _enrich_cycle(cycle, db)


@router.get("/{cycle_id}/items", response_model=List[AuditItemOut])
def get_audit_items(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(AuditItem).filter(AuditItem.cycle_id == cycle_id).all()
    return [AuditItemOut(
        id=i.id, cycle_id=i.cycle_id, asset_id=i.asset_id,
        asset_name=i.asset.name if i.asset else None,
        asset_tag=i.asset.asset_tag if i.asset else None,
        asset_location=i.asset.location if i.asset else None,
        auditor_id=i.auditor_id,
        auditor_name=i.auditor.name if i.auditor else None,
        status=i.status, notes=i.notes, verified_at=i.verified_at,
    ) for i in items]


@router.put("/{cycle_id}/items/{item_id}", response_model=AuditItemOut)
def update_audit_item(cycle_id: UUID, item_id: UUID, data: AuditItemUpdate,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(AuditItem).filter(AuditItem.id == item_id, AuditItem.cycle_id == cycle_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Audit item not found")
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if cycle.status == AuditCycleStatus.closed:
        raise HTTPException(status_code=400, detail="Audit cycle is closed")

    item.status = data.status
    item.notes = data.notes
    item.auditor_id = current_user.id
    if data.status != AuditItemStatus.pending:
        item.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return AuditItemOut(
        id=item.id, cycle_id=item.cycle_id, asset_id=item.asset_id,
        asset_name=item.asset.name if item.asset else None,
        asset_tag=item.asset.asset_tag if item.asset else None,
        asset_location=item.asset.location if item.asset else None,
        auditor_id=item.auditor_id, auditor_name=current_user.name,
        status=item.status, notes=item.notes, verified_at=item.verified_at,
    )


@router.post("/{cycle_id}/close", response_model=AuditCycleOut)
def close_audit(cycle_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Audit cycle not found")
    if cycle.status == AuditCycleStatus.closed:
        raise HTTPException(status_code=400, detail="Already closed")

    cycle.status = AuditCycleStatus.closed
    cycle.closed_by = current_user.id
    cycle.closed_at = datetime.utcnow()

    # Update asset statuses for missing items
    for item in cycle.items:
        if item.status == AuditItemStatus.missing:
            item.asset.status = AssetStatus.lost
            notify_all_admins_and_managers(db, NotificationType.audit_discrepancy,
                                           "Audit Discrepancy", f"Asset {item.asset.asset_tag} confirmed missing in audit {cycle.name}",
                                           "asset", item.asset_id)

    db.commit()
    db.refresh(cycle)
    log_activity(db, current_user.id, f"Closed audit cycle {cycle.name}", "audit", cycle.id)
    db.commit()
    return _enrich_cycle(cycle, db)
