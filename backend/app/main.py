import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app import models
models.Base.metadata.create_all(bind=engine)

from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.attendance.router import router as attendance_router
from app.payroll.router import router as payroll_router
from app.rules.router import router as rules_router
from app.dashboard.router import router as dashboard_router

app = FastAPI(title="Payroll Data Quality API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(attendance_router)
app.include_router(payroll_router)
app.include_router(rules_router)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {"message": "Payroll Data Quality API", "docs": "/docs"}
