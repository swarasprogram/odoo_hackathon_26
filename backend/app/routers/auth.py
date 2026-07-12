from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreate, UserOut, LoginRequest, TokenResponse
from app.services.auth import get_password_hash, authenticate_user, create_access_token
from app.services.notification import log_activity
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        phone=data.phone,
        role=UserRole.employee,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_activity(db, user.id, "User signed up", "user", user.id)
    db.commit()
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status == UserStatus.inactive:
        raise HTTPException(status_code=403, detail="Account is inactive")
    token = create_access_token({"sub": str(user.id)})
    log_activity(db, user.id, "User logged in", "user", user.id)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
