from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.allocation import Allocation, AllocationStatus, TransferRequest, TransferStatus
from app.models.user import User, UserRole
from app.schemas.allocation import AllocationCreate, AllocationReturn, AllocationOut, TransferCreate, TransferAction, TransferOut
from app.dependencies import get_current_user, require_asset_manager_or_admin
from app.services.notification import create_notification, log_activity, notify_all_admins_and_managers
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/allocations", tags=["allocations"])
transfer_router = APIRouter(prefix="/api/transfers", tags=["transfers"])


def _enrich_alloc(a: Allocation) -> AllocationOut:
    return AllocationOut(
        id=a.id, asset_id=a.asset_id,
        asset_tag=a.asset.asset_tag if a.asset else None,
        asset_name=a.asset.name if a.asset else None,
        employee_id=a.employee_id,
        employee_name=a.employee.name if a.employee else None,
        department_id=a.department_id,
        department_name=a.department.name if a.department else None,
        allocated_by=a.allocated_by,
        allocated_by_name=a.allocated_by_user.name if a.allocated_by_user else None,
        allocated_at=a.allocated_at, expected_return_date=a.expected_return_date,
        returned_at=a.returned_at, condition_check_in_notes=a.condition_check_in_notes,
        notes=a.notes, status=a.status, created_at=a.created_at,
    )


@router.get("", response_model=List[AllocationOut])
def list_allocations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Flag overdue allocations first
    now = datetime.utcnow()
    overdues = db.query(Allocation).filter(
        Allocation.status == AllocationStatus.active,
        Allocation.expected_return_date < now,
        Allocation.expected_return_date.isnot(None),
    ).all()
    for o in overdues:
        o.status = AllocationStatus.overdue
    if overdues:
        db.commit()

    q = db.query(Allocation)
    if current_user.role == UserRole.employee:
        q = q.filter(Allocation.employee_id == current_user.id)
    return [_enrich_alloc(a) for a in q.order_by(Allocation.created_at.desc()).all()]


@router.post("", response_model=AllocationOut, status_code=201)
def create_allocation(data: AllocationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status not in [AssetStatus.available]:
        # Find current holder
        active_alloc = db.query(Allocation).filter(
            Allocation.asset_id == asset.id, Allocation.status == AllocationStatus.active
        ).first()
        holder = active_alloc.employee.name if (active_alloc and active_alloc.employee) else "a department"
        raise HTTPException(status_code=409, detail=f"Asset is currently held by {holder}. Use transfer request instead.")

    alloc = Allocation(
        asset_id=data.asset_id, employee_id=data.employee_id,
        department_id=data.department_id, allocated_by=current_user.id,
        expected_return_date=data.expected_return_date, notes=data.notes,
        status=AllocationStatus.active,
    )
    db.add(alloc)
    asset.status = AssetStatus.allocated
    db.commit()
    db.refresh(alloc)

    if data.employee_id:
        create_notification(db, data.employee_id, NotificationType.asset_assigned,
                            "Asset Assigned to You",
                            f"Asset {asset.asset_tag} ({asset.name}) has been assigned to you.",
                            "asset", asset.id)
    log_activity(db, current_user.id, f"Allocated {asset.asset_tag}", "allocation", alloc.id)
    db.commit()
    return _enrich_alloc(alloc)


@router.put("/{alloc_id}/return", response_model=AllocationOut)
def return_allocation(alloc_id: UUID, data: AllocationReturn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alloc = db.query(Allocation).filter(Allocation.id == alloc_id).first()
    if not alloc:
        raise HTTPException(status_code=404, detail="Allocation not found")
    if alloc.status == AllocationStatus.returned:
        raise HTTPException(status_code=400, detail="Already returned")

    alloc.returned_at = datetime.utcnow()
    alloc.condition_check_in_notes = data.condition_check_in_notes
    alloc.status = AllocationStatus.returned
    alloc.asset.status = AssetStatus.available

    log_activity(db, current_user.id, f"Returned {alloc.asset.asset_tag}", "allocation", alloc.id)
    db.commit()
    db.refresh(alloc)
    return _enrich_alloc(alloc)


@router.get("/overdue", response_model=List[AllocationOut])
def get_overdue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    allocs = db.query(Allocation).filter(
        Allocation.expected_return_date < now,
        Allocation.status.in_([AllocationStatus.active, AllocationStatus.overdue]),
        Allocation.expected_return_date.isnot(None),
    ).all()
    return [_enrich_alloc(a) for a in allocs]


# Transfer routes
def _enrich_transfer(t: TransferRequest) -> TransferOut:
    return TransferOut(
        id=t.id, asset_id=t.asset_id,
        asset_tag=t.asset.asset_tag if t.asset else None,
        asset_name=t.asset.name if t.asset else None,
        from_user_id=t.from_user_id,
        from_user_name=t.from_user.name if t.from_user else None,
        to_user_id=t.to_user_id,
        to_user_name=t.to_user.name if t.to_user else None,
        to_department_id=t.to_department_id,
        to_department_name=t.to_department.name if t.to_department else None,
        requested_by=t.requested_by,
        requested_by_name=t.requested_by_user.name if t.requested_by_user else None,
        status=t.status, notes=t.notes, rejection_reason=t.rejection_reason,
        created_at=t.created_at,
    )


@transfer_router.get("", response_model=List[TransferOut])
def list_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(TransferRequest)
    if current_user.role == UserRole.employee:
        q = q.filter((TransferRequest.requested_by == current_user.id) | (TransferRequest.to_user_id == current_user.id))
    return [_enrich_transfer(t) for t in q.order_by(TransferRequest.created_at.desc()).all()]


@transfer_router.post("", response_model=TransferOut, status_code=201)
def create_transfer(data: TransferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    active_alloc = db.query(Allocation).filter(
        Allocation.asset_id == asset.id, Allocation.status == AllocationStatus.active
    ).first()
    from_user_id = active_alloc.employee_id if active_alloc else None
    tr = TransferRequest(
        asset_id=data.asset_id, from_user_id=from_user_id,
        to_user_id=data.to_user_id, to_department_id=data.to_department_id,
        requested_by=current_user.id, notes=data.notes, status=TransferStatus.pending,
    )
    db.add(tr)
    db.commit()
    db.refresh(tr)
    notify_all_admins_and_managers(db, NotificationType.general, "Transfer Request",
                                    f"New transfer request for {asset.asset_tag}", "transfer", tr.id)
    log_activity(db, current_user.id, f"Transfer request for {asset.asset_tag}", "transfer", tr.id)
    db.commit()
    return _enrich_transfer(tr)


@transfer_router.put("/{tr_id}/approve", response_model=TransferOut)
def approve_transfer(tr_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    tr = db.query(TransferRequest).filter(TransferRequest.id == tr_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    if tr.status != TransferStatus.pending:
        raise HTTPException(status_code=400, detail="Transfer already processed")

    # Return previous allocation
    active_alloc = db.query(Allocation).filter(
        Allocation.asset_id == tr.asset_id, Allocation.status == AllocationStatus.active
    ).first()
    if active_alloc:
        active_alloc.returned_at = datetime.utcnow()
        active_alloc.status = AllocationStatus.returned

    # Create new allocation
    new_alloc = Allocation(
        asset_id=tr.asset_id, employee_id=tr.to_user_id,
        department_id=tr.to_department_id, allocated_by=current_user.id,
        status=AllocationStatus.active,
    )
    db.add(new_alloc)
    tr.status = TransferStatus.approved
    tr.approved_by = current_user.id
    tr.asset.status = AssetStatus.allocated
    db.commit()
    db.refresh(tr)

    if tr.to_user_id:
        create_notification(db, tr.to_user_id, NotificationType.transfer_approved,
                            "Transfer Approved", f"Asset {tr.asset.asset_tag} has been transferred to you.", "asset", tr.asset_id)
    log_activity(db, current_user.id, f"Approved transfer for {tr.asset.asset_tag}", "transfer", tr.id)
    db.commit()
    return _enrich_transfer(tr)


@transfer_router.put("/{tr_id}/reject", response_model=TransferOut)
def reject_transfer(tr_id: UUID, data: TransferAction, db: Session = Depends(get_db), current_user: User = Depends(require_asset_manager_or_admin)):
    tr = db.query(TransferRequest).filter(TransferRequest.id == tr_id).first()
    if not tr:
        raise HTTPException(status_code=404, detail="Transfer request not found")
    tr.status = TransferStatus.rejected
    tr.rejection_reason = data.rejection_reason
    db.commit()
    db.refresh(tr)
    if tr.requested_by:
        create_notification(db, tr.requested_by, NotificationType.transfer_rejected,
                            "Transfer Rejected", f"Transfer request for {tr.asset.asset_tag} was rejected.", "transfer", tr.id)
    log_activity(db, current_user.id, f"Rejected transfer for {tr.asset.asset_tag}", "transfer", tr.id)
    db.commit()
    return _enrich_transfer(tr)
