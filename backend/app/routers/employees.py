from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserOut, UserUpdate
from app.dependencies import get_current_user, require_admin
from app.services.notification import log_activity

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=List[UserOut])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).all()
    return users


@router.get("/{user_id}", response_model=UserOut)
def get_employee(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_employee(
    user_id: UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Prevent admin from demoting themselves
    if str(user.id) == str(current_user.id) and data.role and data.role != UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    log_activity(db, current_user.id, f"Updated employee {user.name}", "user", user.id)
    db.commit()
    return user
