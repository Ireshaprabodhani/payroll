from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import RunRulesResponse, FlaggedResultRow, DqScoreResponse
from app.auth.dependencies import require_roles, get_current_user
from app.access import scope_for, hide_allowance
from app.rules import service

router = APIRouter(prefix="/rules", tags=["rules"])

run_roles = require_roles("Admin", "Payroll Manager")
view_roles = require_roles("Admin", "Payroll Manager", "Finance", "HR")
all_roles = require_roles("Admin", "Payroll Manager", "Finance", "HR", "End User")


@router.post("/run")
def run_rules(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(run_roles)):
    return service.run_all_rules(db, payPeriod)


@router.get("/flags")
def get_flags(payPeriod: str = Query(...), db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    rows = service.get_flags(db, payPeriod)
    _, flag_types = scope_for(current_user)
    if flag_types is not None:
        rows = [r for r in rows if r.Flag_Type in flag_types]
    if hide_allowance(current_user.get("role")):
        rows = [r for r in rows if r.Flag_Type != "ALLOWANCE_MISSING_AMOUNT"]
    return [
        {
            "Flag_ID": r.Flag_ID,
            "Record_ID": r.Record_ID,
            "Flag_Type": r.Flag_Type,
            "Severity": r.Severity,
            "Description": r.Description,
        }
        for r in rows
    ]


@router.get("/dq-score", response_model=DqScoreResponse)
def get_dq_score(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(all_roles)):
    return service.get_dq_score(db, payPeriod)
