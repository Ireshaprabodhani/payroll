from sqlalchemy.orm import Session

from app.models import Payroll_Extract, Flagged_Results, Import_Log
from app.rules.rules.rule9_dq_score import rule9_dq_score


def get_summary(db: Session, pay_period: str, department_filter: str | None = None):
    query = db.query(Payroll_Extract).filter(Payroll_Extract.Pay_Period == pay_period)
    if department_filter:
        query = query.filter(Payroll_Extract.Department == department_filter)
    extract = query.all()

    ids = [r.Record_ID for r in extract]
    flags = (
        db.query(Flagged_Results).filter(Flagged_Results.Record_ID.in_(ids)).all()
        if ids else []
    )

    flag_dicts = [{"Record_ID": f.Record_ID} for f in flags]
    dq_score = rule9_dq_score(extract, flag_dicts)

    flag_breakdown: dict[str, int] = {}
    severity_breakdown: dict[str, int] = {}
    for f in flags:
        flag_breakdown[f.Flag_Type] = flag_breakdown.get(f.Flag_Type, 0) + 1
        severity_breakdown[f.Severity] = severity_breakdown.get(f.Severity, 0) + 1

    unique_emps = len({r.Employee_ID for r in extract})
    total_pay = sum(float(r.Pay_Amount) for r in extract if r.Pay_Amount is not None)

    last_import = (
        db.query(Import_Log)
        .filter(Import_Log.Import_Month == pay_period)
        .order_by(Import_Log.Imported_At.desc())
        .first()
    )

    return {
        "payPeriod": pay_period,
        "department": department_filter or "ALL",
        "totalExtractRows": len(extract),
        "uniqueEmployees": unique_emps,
        "totalPayAmount": f"{total_pay:.2f}",
        "totalFlags": len(flags),
        "flaggedRows": len({f.Record_ID for f in flags}),
        "dqScore": dq_score,
        "flagBreakdown": flag_breakdown,
        "severityBreakdown": severity_breakdown,
        "lastImport": last_import,
    }
