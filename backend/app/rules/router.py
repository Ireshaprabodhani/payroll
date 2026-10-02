from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import RunRulesResponse, FlaggedResultRow, DqScoreResponse
from app.auth.dependencies import require_roles
from app.rules import service

router = APIRouter(prefix="/rules", tags=["rules"])

run_roles = require_roles("Admin", "Payroll Manager")
view_roles = require_roles("Admin", "Payroll Manager", "Executive")
all_roles = require_roles("Admin", "Payroll Manager", "Executive", "End User")


@router.post("/run")
def run_rules(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(run_roles)):
    return service.run_all_rules(db, payPeriod)


@router.get("/flags")
def get_flags(payPeriod: str = Query(...), db: Session = Depends(get_db), _=Depends(view_roles)):
    rows = service.get_flags(db, payPeriod)
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
