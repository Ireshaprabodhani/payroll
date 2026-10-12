from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.dashboard import service

from app.models import Payroll_Extract, Flagged_Results
from app.access import scope_for, hide_allowance

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_summary(
    payPeriod: str = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dept_filter, flag_types = scope_for(current_user)
    exclude = {"ALLOWANCE_MISSING_AMOUNT"} if hide_allowance(current_user.get("role")) else None
    return service.get_summary(db, payPeriod, dept_filter, flag_types, exclude)


@router.get("/export")
def export_rows(
    payPeriod: str = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    dept_filter, flag_types = scope_for(current_user)
    query = db.query(Payroll_Extract).filter(Payroll_Extract.Pay_Period == payPeriod)
    if dept_filter:
        query = query.filter(Payroll_Extract.Department == dept_filter)
    rows = query.all()
    ids = [r.Record_ID for r in rows]
    flags = db.query(Flagged_Results).filter(Flagged_Results.Record_ID.in_(ids)).all() if ids else []
    if flag_types is not None:
        flags = [f for f in flags if f.Flag_Type in flag_types]
    if hide_allowance(current_user.get("role")):
        flags = [f for f in flags if f.Flag_Type != "ALLOWANCE_MISSING_AMOUNT"]
    by_record = {}
    for f in flags:
        by_record.setdefault(f.Record_ID, []).append(f)
    out = []
    for r in rows:
        linked = by_record.get(r.Record_ID, [])
        if flag_types is not None and not linked:
            continue
        if not linked:
            continue
        for f in linked:
            out.append({
                "Flag ID": f.Flag_ID,
                "Record ID": r.Record_ID,
                "Employee ID": r.Employee_ID,
                "Department": r.Department,
                "Cost Centre": r.Cost_Centre or "",
                "Pay Period": r.Pay_Period,
                "Pay Type": r.Pay_Type,
                "Hours Worked": str(r.Hours_Worked) if r.Hours_Worked is not None else "",
                "Pay Amount": str(r.Pay_Amount) if r.Pay_Amount is not None else "",
                "Source": r.Source,
                "Flag Type": f.Flag_Type,
                "Severity": f.Severity,
                "Description": f.Description,
            })
    return out


@router.get("/latest-month")
def latest_month(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    from app.models import Import_Log
    row = db.query(Import_Log).order_by(Import_Log.Imported_At.desc()).first()
    return {"payPeriod": row.Import_Month if row else "2020-01"}


@router.get("/summary/department")
def get_dept_summary(
    payPeriod: str = Query(...),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return service.get_summary(db, payPeriod, department)
