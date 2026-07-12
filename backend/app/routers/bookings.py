from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.booking import ResourceBooking, BookingStatus
from app.models.asset import Asset, AssetStatus
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingCancel, BookingOut
from app.dependencies import get_current_user
from app.services.notification import create_notification, log_activity
from app.models.notification import NotificationType

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _enrich_booking(b: ResourceBooking) -> BookingOut:
    return BookingOut(
        id=b.id, asset_id=b.asset_id,
        asset_name=b.asset.name if b.asset else None,
        asset_tag=b.asset.asset_tag if b.asset else None,
        booked_by=b.booked_by,
        booked_by_name=b.booked_by_user.name if b.booked_by_user else None,
        department_id=b.department_id,
        department_name=b.department.name if b.department else None,
        title=b.title, description=b.description,
        start_time=b.start_time, end_time=b.end_time,
        status=b.status, cancellation_reason=b.cancellation_reason,
        created_at=b.created_at,
    )


def _check_overlap(db: Session, asset_id, start_time: datetime, end_time: datetime, exclude_id=None):
    q = db.query(ResourceBooking).filter(
        ResourceBooking.asset_id == asset_id,
        ResourceBooking.status.in_([BookingStatus.upcoming, BookingStatus.ongoing]),
        or_(
            and_(ResourceBooking.start_time < end_time, ResourceBooking.end_time > start_time),
        )
    )
    if exclude_id:
        q = q.filter(ResourceBooking.id != exclude_id)
    return q.first()


@router.get("", response_model=List[BookingOut])
def list_bookings(
    asset_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Auto-update statuses
    now = datetime.utcnow()
    db.query(ResourceBooking).filter(
        ResourceBooking.status == BookingStatus.upcoming,
        ResourceBooking.start_time <= now,
    ).update({"status": BookingStatus.ongoing})
    db.query(ResourceBooking).filter(
        ResourceBooking.status == BookingStatus.ongoing,
        ResourceBooking.end_time <= now,
    ).update({"status": BookingStatus.completed})
    db.commit()

    q = db.query(ResourceBooking)
    if asset_id:
        q = q.filter(ResourceBooking.asset_id == asset_id)
    from app.models.user import UserRole
    if current_user.role == UserRole.employee:
        q = q.filter(ResourceBooking.booked_by == current_user.id)
    return [_enrich_booking(b) for b in q.order_by(ResourceBooking.start_time.desc()).all()]


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id, Asset.is_bookable == True).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Bookable asset not found")

    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    overlap = _check_overlap(db, data.asset_id, data.start_time, data.end_time)
    if overlap:
        raise HTTPException(status_code=409, detail=f"Booking overlaps with an existing booking ({overlap.start_time.strftime('%H:%M')} – {overlap.end_time.strftime('%H:%M')})")

    booking = ResourceBooking(
        asset_id=data.asset_id, booked_by=current_user.id,
        department_id=data.department_id, title=data.title,
        description=data.description, start_time=data.start_time,
        end_time=data.end_time, status=BookingStatus.upcoming,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    create_notification(db, current_user.id, NotificationType.booking_confirmed,
                        "Booking Confirmed", f"Your booking for {asset.name} is confirmed.",
                        "booking", booking.id)
    log_activity(db, current_user.id, f"Booked {asset.name}", "booking", booking.id)
    db.commit()
    return _enrich_booking(booking)


@router.put("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: UUID, data: BookingCancel, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    booking = db.query(ResourceBooking).filter(ResourceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in [BookingStatus.completed, BookingStatus.cancelled]:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
    booking.status = BookingStatus.cancelled
    booking.cancellation_reason = data.cancellation_reason
    db.commit()
    db.refresh(booking)
    create_notification(db, booking.booked_by, NotificationType.booking_cancelled,
                        "Booking Cancelled", f"Your booking for {booking.asset.name} has been cancelled.",
                        "booking", booking.id)
    log_activity(db, current_user.id, f"Cancelled booking {booking_id}", "booking", booking.id)
    db.commit()
    return _enrich_booking(booking)


@router.get("/calendar/{asset_id}")
def get_calendar(asset_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bookings = db.query(ResourceBooking).filter(
        ResourceBooking.asset_id == asset_id,
        ResourceBooking.status.in_([BookingStatus.upcoming, BookingStatus.ongoing]),
    ).all()
    return [{"id": str(b.id), "title": b.title, "start": b.start_time, "end": b.end_time,
             "booked_by": b.booked_by_user.name if b.booked_by_user else None, "status": b.status} for b in bookings]
