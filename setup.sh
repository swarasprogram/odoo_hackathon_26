#!/usr/bin/env bash
# AssetFlow Setup Script
set -e
echo "=== AssetFlow Setup ==="

# 1. Start Postgres
echo "Starting PostgreSQL..."
docker-compose up -d db
sleep 5

# 2. Backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Create default admin user
python3 -c "
import sys; sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.services.auth import get_password_hash
db = SessionLocal()
admin = db.query(User).filter(User.email=='admin@assetflow.com').first()
if not admin:
    u = User(name='Administrator', email='admin@assetflow.com', password_hash=get_password_hash('Admin@1234'), role=UserRole.admin, status=UserStatus.active)
    db.add(u); db.commit(); print('Admin created: admin@assetflow.com / Admin@1234')
else:
    print('Admin already exists')
db.close()
"
deactivate
cd ..

echo ""
echo "=== Setup Complete ==="
echo "Start backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "Start frontend: cd frontend && npm install && npm run dev"
echo "Admin login:    admin@assetflow.com / Admin@1234"
