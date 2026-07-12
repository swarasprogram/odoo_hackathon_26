# AssetFlow — Enterprise Asset & Resource Management System

## Quick Start

### Prerequisites
- PostgreSQL 14+
- Python 3.10+
- Node.js 18+

---

## 1. Database Setup

```bash
# Create user and database (run as postgres superuser)
sudo -u postgres psql << 'EOF'
CREATE USER assetflow WITH PASSWORD 'assetflow123';
CREATE DATABASE assetflow_db OWNER assetflow;
GRANT ALL PRIVILEGES ON DATABASE assetflow_db TO assetflow;
EOF
```

---

## 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Alembic migrations
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
    u = User(name='Administrator', email='admin@assetflow.com',
             password_hash=get_password_hash('Admin@1234'),
             role=UserRole.admin, status=UserStatus.active)
    db.add(u); db.commit()
    print('Admin created: admin@assetflow.com / Admin@1234')
else:
    print('Admin already exists')
db.close()
"

# Start backend server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@assetflow.com | Admin@1234 |

> New signups are always created as **Employee** role.  
> Admin promotes roles from **Org Setup → Employee Directory**.

---

## Architecture

```
assetflow/
├── backend/               # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # API route handlers
│   │   ├── services/      # Business logic (auth, notifications)
│   │   ├── dependencies.py  # Auth/role guards
│   │   ├── database.py    # DB session
│   │   ├── config.py      # Settings
│   │   └── main.py        # FastAPI app
│   ├── alembic/           # Database migrations
│   └── requirements.txt
│
├── frontend/              # React + Vite
│   └── src/
│       ├── pages/         # All 10 screens
│       ├── components/    # Layout + common UI
│       ├── contexts/      # AuthContext
│       └── api/           # Axios client
│
└── docker-compose.yml     # PostgreSQL container (optional)
```

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: org setup, role promotion, all features |
| **Asset Manager** | Register assets, approve allocations/transfers/maintenance |
| **Department Head** | View dept assets, approve dept transfers, book resources |
| **Employee** | View own assets, book resources, raise maintenance/transfer requests |

## Key Business Rules

- ✅ Signup always creates Employee accounts (no self-elevating roles)
- ✅ Double-allocation blocked — system shows current holder and offers transfer
- ✅ Booking overlap prevented — exact time range validation
- ✅ Maintenance must be approved before asset moves to "Under Maintenance"
- ✅ Closing an audit cycle marks missing assets as "Lost"
- ✅ Overdue allocations auto-flagged past Expected Return Date
