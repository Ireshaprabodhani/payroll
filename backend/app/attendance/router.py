from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import UploadResponse, AttendanceRow
from app.auth.dependencies import require_roles, get_current_user
from app.attendance import service

router = APIRouter(prefix="/attendance", tags=["attendance"])

upload_roles = require_roles("Admin", "Payroll Manager")
view_roles = require_roles("Admin", "Payroll Manager")


@router.post("/upload", response_model=UploadResponse)
async def upload_attendance(
    file: UploadFile = File(...),
    importMonth: str = Query(...),
    db: Session = Depends(get_db),
    _=Depends(upload_roles),
):
    content = await file.read()
    return service.upload_attendance(db, content, file.filename or "upload.csv", importMonth)


@router.get("/history")
def get_history(
    importMonth: str = Query(...),
    db: Session = Depends(get_db),
    _=Depends(view_roles),
):
    return service.get_history(db, importMonth)
