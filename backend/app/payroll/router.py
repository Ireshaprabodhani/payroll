from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import CalculateResponse, SeedResponse, PayrollExtractRow
from app.auth.dependencies import require_roles, get_current_user
from app.access import scope_for
from app.payroll import service

router = APIRouter(prefix="/payroll", tags=["payroll"])

payroll_roles = require_roles("Admin", "Payroll Manager")
admin_only = require_roles("Admin")
view_roles = require_roles("Admin", "Payroll Manager", "Finance")


@router.post("/calculate", response_model=CalculateResponse)
def calculate(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(payroll_roles)):
    return service.calculate_payroll(db, payPeriod)


@router.post("/seed-dirty", response_model=SeedResponse)
def seed_dirty(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(admin_only)):
    return service.seed_dirty_data(db, payPeriod)


@router.post("/process")
def process(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(payroll_roles)):
    return service.process_payroll(db, payPeriod)


@router.get("/extract")
def get_extract(payPeriod: str = Query(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in {"Admin", "Payroll Manager", "Finance"}:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not allowed")
    rows = service.get_extract(db, payPeriod)
    dept, _ = scope_for(current_user)
    if dept:
        rows = [r for r in rows if r.Department == dept]
    if current_user.get("role") == "Finance":
        rows = [r for r in rows if r.Pay_Type == "Allowance" or r.Cost_Centre in (None, "", "CC-999") or (r.Pay_Amount is not None and float(r.Pay_Amount) <= 0)]
    return [
        {
            "Record_ID": r.Record_ID,
            "Employee_ID": r.Employee_ID,
            "Department": r.Department,
            "Cost_Centre": r.Cost_Centre,
            "Pay_Period": r.Pay_Period,
            "Pay_Type": r.Pay_Type,
            "Hours_Worked": str(r.Hours_Worked) if r.Hours_Worked is not None else None,
            "Pay_Amount": str(r.Pay_Amount) if r.Pay_Amount is not None else None,
            "Source": r.Source,
        }
        for r in rows
    ]
