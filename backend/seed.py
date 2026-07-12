import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import (
    User, UserRole, UserStatus,
    Department, AssetCategory, Asset, AssetStatus, AssetCondition,
    Allocation, AllocationStatus,
    ResourceBooking, BookingStatus,
    MaintenanceRequest, MaintenancePriority, MaintenanceStatus,
    AuditCycle, AuditCycleStatus, AuditItem, AuditItemStatus,
    Notification
)
from app.services.auth import get_password_hash

def seed_data():
    db = SessionLocal()
    
    # 1. Check if already seeded (look for some departments)
    if db.query(Department).count() > 0:
        print("Database already contains departments. Clear the DB if you want to re-seed.")
        db.close()
        return

    print("Seeding database...")
    
    # 2. Users
    pwd = get_password_hash("password123")
    
    # Admin is already there from setup, but let's make sure
    admin = db.query(User).filter(User.email == "admin@assetflow.com").first()
    if not admin:
        admin = User(name="System Admin", email="admin@assetflow.com", password_hash=pwd, role=UserRole.admin, status=UserStatus.active)
        db.add(admin)
        db.commit()

    users = [
        User(name="Alice Manager", email="alice@assetflow.com", password_hash=pwd, role=UserRole.asset_manager, status=UserStatus.active),
        User(name="Bob Head", email="bob@assetflow.com", password_hash=pwd, role=UserRole.department_head, status=UserStatus.active),
        User(name="Charlie Emp", email="charlie@assetflow.com", password_hash=pwd, role=UserRole.employee, status=UserStatus.active),
        User(name="Diana Emp", email="diana@assetflow.com", password_hash=pwd, role=UserRole.employee, status=UserStatus.active),
        User(name="Eve Tech", email="eve@assetflow.com", password_hash=pwd, role=UserRole.employee, status=UserStatus.active),
    ]
    db.add_all(users)
    db.commit()
    
    # Refresh to get IDs
    alice = db.query(User).filter(User.email == "alice@assetflow.com").first()
    bob = db.query(User).filter(User.email == "bob@assetflow.com").first()
    charlie = db.query(User).filter(User.email == "charlie@assetflow.com").first()
    diana = db.query(User).filter(User.email == "diana@assetflow.com").first()
    eve = db.query(User).filter(User.email == "eve@assetflow.com").first()

    # 3. Departments
    it_dept = Department(name="IT Department", description="Information Technology and Support", head_id=bob.id)
    hr_dept = Department(name="Human Resources", description="HR and Recruitment", head_id=None)
    ops_dept = Department(name="Operations", description="Day-to-day operations", head_id=None)
    
    db.add_all([it_dept, hr_dept, ops_dept])
    db.commit()

    # Assign users to depts
    alice.department_id = it_dept.id
    bob.department_id = it_dept.id
    charlie.department_id = hr_dept.id
    diana.department_id = ops_dept.id
    eve.department_id = it_dept.id
    db.commit()

    # 4. Asset Categories
    cat_laptop = AssetCategory(name="Laptops", description="Work laptops", warranty_period_months=36)
    cat_monitor = AssetCategory(name="Monitors", description="External displays", warranty_period_months=24)
    cat_vehicle = AssetCategory(name="Vehicles", description="Company cars", warranty_period_months=60)
    cat_room = AssetCategory(name="Meeting Rooms", description="Bookable spaces")
    
    db.add_all([cat_laptop, cat_monitor, cat_vehicle, cat_room])
    db.commit()

    # 5. Assets
    now = datetime.utcnow()
    assets = [
        # Laptops
        Asset(name="MacBook Pro 16", asset_tag="LT-001", serial_number="MBP-1001", category_id=cat_laptop.id, department_id=it_dept.id, status=AssetStatus.allocated, condition=AssetCondition.good, acquisition_date=now - timedelta(days=300), acquisition_cost=2500, registered_by=admin.id),
        Asset(name="Dell XPS 15", asset_tag="LT-002", serial_number="DXP-2002", category_id=cat_laptop.id, department_id=hr_dept.id, status=AssetStatus.allocated, condition=AssetCondition.fair, acquisition_date=now - timedelta(days=500), acquisition_cost=1800, registered_by=alice.id),
        Asset(name="ThinkPad T14", asset_tag="LT-003", serial_number="TP-3003", category_id=cat_laptop.id, department_id=ops_dept.id, status=AssetStatus.available, condition=AssetCondition.excellent, acquisition_date=now - timedelta(days=30), acquisition_cost=1500, registered_by=alice.id),
        Asset(name="MacBook Air M2", asset_tag="LT-004", serial_number="MBA-4004", category_id=cat_laptop.id, status=AssetStatus.under_maintenance, condition=AssetCondition.damaged, registered_by=alice.id),
        
        # Monitors
        Asset(name="Dell 27 4K", asset_tag="MN-001", category_id=cat_monitor.id, status=AssetStatus.allocated, condition=AssetCondition.good, registered_by=admin.id),
        Asset(name="LG Ultrawide", asset_tag="MN-002", category_id=cat_monitor.id, status=AssetStatus.available, condition=AssetCondition.good, registered_by=admin.id),
        
        # Vehicles (Bookable)
        Asset(name="Toyota Prius (Pool Car)", asset_tag="VH-001", category_id=cat_vehicle.id, status=AssetStatus.available, condition=AssetCondition.good, is_bookable=True, registered_by=admin.id),
        
        # Rooms (Bookable)
        Asset(name="Conference Room A (Zenith)", asset_tag="RM-001", category_id=cat_room.id, status=AssetStatus.available, condition=AssetCondition.excellent, is_bookable=True, location="Floor 2", registered_by=admin.id),
        Asset(name="Focus Room B", asset_tag="RM-002", category_id=cat_room.id, status=AssetStatus.available, condition=AssetCondition.good, is_bookable=True, location="Floor 3", registered_by=admin.id),
    ]
    db.add_all(assets)
    db.commit()

    # Get asset instances
    lt1 = db.query(Asset).filter_by(asset_tag="LT-001").first()
    lt2 = db.query(Asset).filter_by(asset_tag="LT-002").first()
    lt4 = db.query(Asset).filter_by(asset_tag="LT-004").first()
    mn1 = db.query(Asset).filter_by(asset_tag="MN-001").first()
    vh1 = db.query(Asset).filter_by(asset_tag="VH-001").first()
    rm1 = db.query(Asset).filter_by(asset_tag="RM-001").first()

    # 6. Allocations
    allocations = [
        # Active
        Allocation(asset_id=lt1.id, employee_id=bob.id, allocated_by=admin.id, status=AllocationStatus.active),
        Allocation(asset_id=lt2.id, employee_id=charlie.id, allocated_by=alice.id, status=AllocationStatus.active),
        Allocation(asset_id=mn1.id, employee_id=bob.id, allocated_by=admin.id, status=AllocationStatus.active),
        # Overdue
        Allocation(asset_id=lt4.id, employee_id=diana.id, allocated_by=alice.id, status=AllocationStatus.overdue, expected_return_date=now - timedelta(days=5)),
    ]
    db.add_all(allocations)
    db.commit()
    
    # Set current holders
    lt1.current_holder = bob.name
    lt2.current_holder = charlie.name
    mn1.current_holder = bob.name
    lt4.current_holder = diana.name
    db.commit()

    # 7. Bookings
    bookings = [
        # Past
        ResourceBooking(asset_id=rm1.id, booked_by=charlie.id, title="Weekly Sync", start_time=now - timedelta(days=1, hours=2), end_time=now - timedelta(days=1, hours=1), status=BookingStatus.completed),
        # Upcoming
        ResourceBooking(asset_id=rm1.id, booked_by=diana.id, title="Client Presentation", start_time=now + timedelta(hours=2), end_time=now + timedelta(hours=4), status=BookingStatus.upcoming),
        ResourceBooking(asset_id=vh1.id, booked_by=bob.id, title="Site Visit", start_time=now + timedelta(days=2, hours=1), end_time=now + timedelta(days=2, hours=8), status=BookingStatus.upcoming),
    ]
    db.add_all(bookings)
    db.commit()

    # 8. Maintenance
    maints = [
        MaintenanceRequest(asset_id=lt4.id, raised_by=diana.id, description="Screen cracked during transport", priority=MaintenancePriority.high, status=MaintenanceStatus.in_progress, technician_id=eve.id),
        MaintenanceRequest(asset_id=lt2.id, raised_by=charlie.id, description="Battery drains too fast", priority=MaintenancePriority.medium, status=MaintenanceStatus.pending),
    ]
    db.add_all(maints)
    db.commit()

    # 9. Audits
    cycle = AuditCycle(name="Q3 Full Inventory Check", start_date=now - timedelta(days=2), end_date=now + timedelta(days=5), created_by=admin.id, status=AuditCycleStatus.active)
    db.add(cycle)
    db.commit()

    audit_items = [
        AuditItem(cycle_id=cycle.id, asset_id=lt1.id, status=AuditItemStatus.verified),
        AuditItem(cycle_id=cycle.id, asset_id=lt2.id, status=AuditItemStatus.pending),
        AuditItem(cycle_id=cycle.id, asset_id=lt3.id, status=AuditItemStatus.pending) if (lt3 := db.query(Asset).filter_by(asset_tag="LT-003").first()) else None,
        AuditItem(cycle_id=cycle.id, asset_id=lt4.id, status=AuditItemStatus.damaged, notes="Screen damaged"),
    ]
    db.add_all([item for item in audit_items if item])
    db.commit()

    # 10. Notifications
    notifs = [
        Notification(user_id=alice.id, title="New Maintenance Request", message="Charlie Emp raised a maintenance request for LT-002.", is_read=False),
        Notification(user_id=diana.id, title="Overdue Asset Return", message="Your allocation for LT-004 is overdue by 5 days.", is_read=False),
        Notification(user_id=bob.id, title="Booking Confirmed", message="Your booking for VH-001 has been confirmed.", is_read=True),
    ]
    db.add_all(notifs)
    db.commit()

    print("✅ Database successfully seeded!")
    db.close()

if __name__ == "__main__":
    seed_data()
