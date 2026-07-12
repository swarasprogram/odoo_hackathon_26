from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus
from app.models.asset import Asset, AssetStatus
from app.models.user import User, UserRole
from app.schemas.maintenance import MaintenanceCreate, MaintenanceApprove, MaintenanceReject, MaintenanceAssign, MaintenanceResolve, MaintenanceOut
from app.dependencies import get_current_user, require_asset_manager_or_admin
from app.services.notification import create_notification, log_activity, notify_all_admins_and_managers
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


def _enrich(m: MaintenanceRequest) -> MaintenanceOut:
    return MaintenanceOut(
        id=m.id, asset_id=m.asset_id,
        asset_name=m.asset.name if m.asset else None,
        asset_tag=m.asset.asset_tag if m.asset else None,
        raised_by=m.raised_by,
        raised_by_name=m.raised_by_user.name if m.raised_by_user else None,
        description=m.description, priority=m.priority, status=m.status,
        photo_url=m.photo_url, approved_by=m.approved_by,
        approved_by_name=m.approved_by_user.name if m.approved_by_user else None,
        rejection_reason=m.rejection_reason, technician_id=m.technician_id,
        technician_name=m.technician.name if m.technician else None,
        technician_notes=m.technician_notes, resolved_at=m.resolved_at,
        estimated_cost=m.estimated_cost, created_at=m.created_at, updated_at=m.updated_at,
    )


@router.get("", response_model=List[MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(MaintenanceRequest)
    if current_user.role == UserRole.employee:
        q = q.filter(MaintenanceRequest.raised_by == current_user.id)
    return [_enrich(m) for m in q.order_by(MaintenanceRequest.created_at.desc()).all()]


@router.post("", response_model=MaintenanceOut, status_code=201)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    mr = MaintenanceRequest(
        asset_id=data.asset_id, raised_by=current_user.id,
        description=data.description, priority=data.priority,
        status=MaintenanceStatus.pending,
    )
    db.add(mr)
    db.commit()
    db.refresh(mr)
    notify_all_admins_and_managers(db, NotificationType.general, "Maintenance Request",
                                    f"Maintenance requested for {asset.asset_tag}: {data.priority.value} priority", "maintenance", mr.id)
    log_activity(db, current_user.id, f"Raised maintenance for {asset.asset_tag}", "maintenance", mr.id)
    db.commit()
    return _enrich(mr)


@router.put("/{mr_id}/approve", response_model=MaintenanceOut)
def approve_maintenance(mr_id: UUID, data: MaintenanceApprove, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    mr = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == mr_id).first()
    if not mr or mr.status != MaintenanceStatus.pending:
        raise HTTPException(status_code=404, detail="Pending maintenance request not found")
    mr.status = MaintenanceStatus.approved if not data.technician_id else MaintenanceStatus.assigned
    mr.approved_by = current_user.id
    mr.technician_id = data.technician_id
    mr.asset.status = AssetStatus.under_maintenance
    db.commit()
    db.refresh(mr)
    create_notification(db, mr.raised_by, NotificationType.maintenance_approved,
                        "Maintenance Approved", f"Your maintenance request for {mr.asset.asset_tag} has been approved.",
                        "maintenance", mr.id)
    log_activity(db, current_user.id, f"Approved maintenance {mr_id}", "maintenance", mr.id)
    db.commit()
    return _enrich(mr)


@router.put("/{mr_id}/reject", response_model=MaintenanceOut)
def reject_maintenance(mr_id: UUID, data: MaintenanceReject, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    mr = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == mr_id).first()
    if not mr or mr.status != MaintenanceStatus.pending:
        raise HTTPException(status_code=404, detail="Pending maintenance request not found")
    mr.status = MaintenanceStatus.rejected
    mr.rejection_reason = data.rejection_reason
    db.commit()
    db.refresh(mr)
    create_notification(db, mr.raised_by, NotificationType.maintenance_rejected,
                        "Maintenance Rejected", f"Your maintenance request for {mr.asset.asset_tag} was rejected: {data.rejection_reason}",
                        "maintenance", mr.id)
    db.commit()
    return _enrich(mr)


@router.put("/{mr_id}/resolve", response_model=MaintenanceOut)
def resolve_maintenance(mr_id: UUID, data: MaintenanceResolve, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    mr = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.id == mr_id,
        MaintenanceRequest.status.in_([MaintenanceStatus.approved, MaintenanceStatus.assigned, MaintenanceStatus.in_progress])
    ).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Active maintenance request not found")
    mr.status = MaintenanceStatus.resolved
    mr.technician_notes = data.technician_notes
    mr.estimated_cost = data.estimated_cost
    mr.resolved_at = datetime.utcnow()
    mr.asset.status = AssetStatus.available
    db.commit()
    db.refresh(mr)
    create_notification(db, mr.raised_by, NotificationType.maintenance_resolved,
                        "Maintenance Resolved", f"Asset {mr.asset.asset_tag} maintenance completed.",
                        "maintenance", mr.id)
    log_activity(db, current_user.id, f"Resolved maintenance {mr_id}", "maintenance", mr.id)
    db.commit()
    return _enrich(mr)
