from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.notification import Notification, ActivityLog
from app.models.user import User
from app.schemas.notification import NotificationOut, ActivityLogOut
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/notifications", tags=["notifications"])
logs_router = APIRouter(prefix="/api/activity-logs", tags=["activity-logs"])


@router.get("", response_model=List[NotificationOut])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()


@router.put("/{notif_id}/read")
def mark_read(notif_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).count()
    return {"count": count}


@logs_router.get("", response_model=List[ActivityLogOut])
def get_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100).all()
    return [ActivityLogOut(
        id=l.id, user_id=l.user_id,
        user_name=l.user.name if l.user else "System",
        action=l.action, entity_type=l.entity_type,
        entity_id=l.entity_id, details=l.details, created_at=l.created_at,
    ) for l in logs]
