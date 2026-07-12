from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.allocation import Allocation, AllocationStatus
from app.models.booking import ResourceBooking, BookingStatus
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus
from app.models.audit import AuditCycle
from app.models.department import Department
from app.models.user import User
from app.dependencies import get_current_user
from datetime import datetime, timedelta
from typing import List, Dict, Any

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    now = datetime.utcnow()

    total_assets = db.query(Asset).count()
    available = db.query(Asset).filter(Asset.status == AssetStatus.available).count()
    allocated = db.query(Asset).filter(Asset.status == AssetStatus.allocated).count()
    under_maintenance = db.query(Asset).filter(Asset.status == AssetStatus.under_maintenance).count()

    active_bookings = db.query(ResourceBooking).filter(
        ResourceBooking.status.in_([BookingStatus.upcoming, BookingStatus.ongoing])
    ).count()

    pending_maintenance = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status == MaintenanceStatus.pending
    ).count()

    from app.models.allocation import TransferRequest, TransferStatus
    pending_transfers = db.query(TransferRequest).filter(
        TransferRequest.status == TransferRequest.status == "pending"
    ).count()

    overdue = db.query(Allocation).filter(
        Allocation.expected_return_date < now,
        Allocation.status.in_([AllocationStatus.active, AllocationStatus.overdue]),
        Allocation.expected_return_date.isnot(None),
    ).count()

    upcoming_returns = db.query(Allocation).filter(
        Allocation.expected_return_date >= now,
        Allocation.expected_return_date <= now + timedelta(days=7),
        Allocation.status == AllocationStatus.active,
    ).count()

    # Recent activity
    recent_allocations = db.query(Allocation).filter(
        Allocation.allocated_at >= now - timedelta(days=7)
    ).count()

    return {
        "total_assets": total_assets,
        "available": available,
        "allocated": allocated,
        "under_maintenance": under_maintenance,
        "active_bookings": active_bookings,
        "pending_maintenance": pending_maintenance,
        "pending_transfers": pending_transfers,
        "overdue_returns": overdue,
        "upcoming_returns": upcoming_returns,
        "recent_allocations": recent_allocations,
    }


@router.get("/utilization")
def get_utilization(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assets = db.query(Asset).all()
    result = []
    for asset in assets:
        alloc_count = db.query(Allocation).filter(Allocation.asset_id == asset.id).count()
        booking_count = db.query(ResourceBooking).filter(ResourceBooking.asset_id == asset.id).count()
        result.append({
            "asset_id": str(asset.id), "asset_name": asset.name,
            "asset_tag": asset.asset_tag, "status": asset.status,
            "allocation_count": alloc_count, "booking_count": booking_count,
            "total_usage": alloc_count + booking_count,
        })
    result.sort(key=lambda x: x["total_usage"], reverse=True)
    return result[:20]


@router.get("/department-allocation")
def get_dept_allocation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    depts = db.query(Department).filter(Department.is_active == True).all()
    result = []
    for dept in depts:
        asset_count = db.query(Allocation).join(Allocation.asset).filter(
            Asset.department_id == dept.id,
            Allocation.status == AllocationStatus.active,
        ).count()
        employee_count = db.query(User).filter(User.department_id == dept.id).count()
        result.append({
            "department_id": str(dept.id), "department_name": dept.name,
            "allocated_assets": asset_count, "employee_count": employee_count,
        })
    return result


@router.get("/maintenance-frequency")
def get_maintenance_freq(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.department import AssetCategory
    cats = db.query(AssetCategory).all()
    result = []
    for cat in cats:
        count = db.query(MaintenanceRequest).join(Asset).filter(Asset.category_id == cat.id).count()
        result.append({"category": cat.name, "maintenance_count": count})
    result.sort(key=lambda x: x["maintenance_count"], reverse=True)
    return result


@router.get("/asset-status-distribution")
def get_status_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    statuses = [s for s in AssetStatus]
    return [{"status": s.value, "count": db.query(Asset).filter(Asset.status == s).count()} for s in statuses]
