from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.dashboard import service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    payPeriod: str = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # End User role: scope to their department
    dept_filter = None
    if current_user["role"] == "End User":
        dept_filter = current_user.get("department")
    return service.get_summary(db, payPeriod, dept_filter)


@router.get("/summary/department")
def get_dept_summary(
    payPeriod: str = Query(...),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return service.get_summary(db, payPeriod, department)
