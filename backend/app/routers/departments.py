from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models.department import Department, AssetCategory
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut, CategoryCreate, CategoryUpdate, CategoryOut
from app.dependencies import get_current_user, require_admin, require_asset_manager_or_admin
from app.services.notification import log_activity

router = APIRouter(prefix="/api/departments", tags=["departments"])
cat_router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    depts = db.query(Department).all()
    result = []
    for d in depts:
        emp_count = db.query(User).filter(User.department_id == d.id).count()
        head_name = d.head.name if d.head else None
        out = DepartmentOut(
            id=d.id, name=d.name, description=d.description,
            head_id=d.head_id, parent_id=d.parent_id, is_active=d.is_active,
            created_at=d.created_at, head_name=head_name, employee_count=emp_count
        )
        result.append(out)
    return result


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_activity(db, current_user.id, f"Created department {dept.name}", "department", dept.id)
    db.commit()
    return DepartmentOut(id=dept.id, name=dept.name, description=dept.description,
                         head_id=dept.head_id, parent_id=dept.parent_id, is_active=dept.is_active,
                         created_at=dept.created_at, employee_count=0)


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: UUID, data: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(dept, field, val)
    db.commit()
    db.refresh(dept)
    log_activity(db, current_user.id, f"Updated department {dept.name}", "department", dept.id)
    db.commit()
    emp_count = db.query(User).filter(User.department_id == dept.id).count()
    return DepartmentOut(id=dept.id, name=dept.name, description=dept.description,
                         head_id=dept.head_id, parent_id=dept.parent_id, is_active=dept.is_active,
                         created_at=dept.created_at, head_name=dept.head.name if dept.head else None,
                         employee_count=emp_count)


@router.delete("/{dept_id}")
def delete_department(dept_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_active = False
    db.commit()
    return {"message": "Department deactivated"}


# Category routes
@cat_router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.asset import Asset
    cats = db.query(AssetCategory).all()
    result = []
    for c in cats:
        count = db.query(Asset).filter(Asset.category_id == c.id).count()
        result.append(CategoryOut(
            id=c.id, name=c.name, description=c.description,
            warranty_period_months=c.warranty_period_months,
            custom_fields=c.custom_fields, is_active=c.is_active,
            created_at=c.created_at, asset_count=count
        ))
    return result


@cat_router.post("", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    cat = AssetCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_activity(db, current_user.id, f"Created category {cat.name}", "category", cat.id)
    db.commit()
    return CategoryOut(id=cat.id, name=cat.name, description=cat.description,
                       warranty_period_months=cat.warranty_period_months, custom_fields=cat.custom_fields,
                       is_active=cat.is_active, created_at=cat.created_at, asset_count=0)


@cat_router.put("/{cat_id}", response_model=CategoryOut)
def update_category(cat_id: UUID, data: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    from app.models.asset import Asset
    cat = db.query(AssetCategory).filter(AssetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, val)
    db.commit()
    db.refresh(cat)
    count = db.query(Asset).filter(Asset.category_id == cat.id).count()
    return CategoryOut(id=cat.id, name=cat.name, description=cat.description,
                       warranty_period_months=cat.warranty_period_months, custom_fields=cat.custom_fields,
                       is_active=cat.is_active, created_at=cat.created_at, asset_count=count)
