from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType, ActivityLog
from app.models.user import User
import json


def create_notification(
    db: Session,
    user_id,
    notif_type: NotificationType,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: str = None,
):
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
    )
    db.add(notif)
    db.flush()
    return notif


def log_activity(
    db: Session,
    user_id,
    action: str,
    entity_type: str = None,
    entity_id=None,
    details: dict = None,
):
    log = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        details=json.dumps(details) if details else None,
    )
    db.add(log)
    db.flush()
    return log


def notify_all_admins_and_managers(
    db: Session,
    notif_type: NotificationType,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id=None,
):
    from app.models.user import UserRole
    managers = db.query(User).filter(
        User.role.in_([UserRole.admin, UserRole.asset_manager])
    ).all()
    for m in managers:
        create_notification(db, m.id, notif_type, title, message, entity_type, entity_id)
