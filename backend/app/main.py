from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.employees import router as employees_router
from app.routers.departments import router as departments_router, cat_router as categories_router
from app.routers.assets import router as assets_router
from app.routers.allocations import router as allocations_router, transfer_router
from app.routers.bookings import router as bookings_router
from app.routers.maintenance import router as maintenance_router
from app.routers.audits import router as audits_router
from app.routers.reports import router as reports_router
from app.routers.notifications import router as notifications_router, logs_router

app = FastAPI(
    title="AssetFlow API",
    description="Enterprise Asset & Resource Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(departments_router)
app.include_router(categories_router)
app.include_router(assets_router)
app.include_router(allocations_router)
app.include_router(transfer_router)
app.include_router(bookings_router)
app.include_router(maintenance_router)
app.include_router(audits_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(logs_router)


@app.get("/")
def root():
    return {"message": "AssetFlow API", "version": "1.0.0", "status": "operational"}


@app.get("/health")
def health():
    return {"status": "healthy"}
