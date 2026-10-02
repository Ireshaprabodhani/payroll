from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import CalculateResponse, SeedResponse, PayrollExtractRow
from app.auth.dependencies import require_roles
from app.payroll import service

router = APIRouter(prefix="/payroll", tags=["payroll"])

payroll_roles = require_roles("Admin", "Payroll Manager")
admin_only = require_roles("Admin")
view_roles = require_roles("Admin", "Payroll Manager", "Executive")


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
def get_extract(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(view_roles)):
    rows = service.get_extract(db, payPeriod)
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
