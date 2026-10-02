from sqlalchemy.orm import Session

from app.models import (
    Payroll_Extract, Attendance_History, Valid_Departments, Valid_Cost_Centres,
    Employee_Department_Master, Company_Master_Rules, Import_Log, Flagged_Results,
)
from app.rules.rules.rule1_duplicate_payment import rule1_duplicate_payment
from app.rules.rules.rule2_out_of_range_hours import rule2_out_of_range_hours
from app.rules.rules.rule3_missing_cost_centre import rule3_missing_cost_centre
from app.rules.rules.rule4_incomplete_data import rule4_incomplete_data
from app.rules.rules.rule5_invalid_data import rule5_invalid_data
from app.rules.rules.rule6_allowance_missing_amount import rule6_allowance_missing_amount
from app.rules.rules.rule7_negative_zero_payment import rule7_negative_zero_payment
from app.rules.rules.rule8_department_mismatch import rule8_department_mismatch
from app.rules.rules.rule9_dq_score import rule9_dq_score
from app.rules.rules.rule10_scheduled_report_marker import rule10_scheduled_report_marker


def run_all_rules(db: Session, pay_period: str) -> dict:
    # Load all data in one batch
    extract = db.query(Payroll_Extract).filter(Payroll_Extract.Pay_Period == pay_period).all()
    attendance = db.query(Attendance_History).filter(Attendance_History.Import_Month == pay_period).all()
    departments = db.query(Valid_Departments).all()
    cost_centres = db.query(Valid_Cost_Centres).all()
    emp_depts = db.query(Employee_Department_Master).all()
    rule_values = db.query(Company_Master_Rules).all()
    import_log = db.query(Import_Log).filter(Import_Log.Import_Month == pay_period).all()

    dept_set = {d.Department for d in departments}
    cc_set = {c.Cost_Centre_Code for c in cost_centres}
    emp_map = {e.Employee_ID: e.Official_Department for e in emp_depts}
    rules_map = {r.Rule_Name: float(r.Value) for r in rule_values}

    # Run rules 1–8
    all_flags = (
        rule1_duplicate_payment(extract)
        + rule2_out_of_range_hours(extract, attendance, rules_map)
        + rule3_missing_cost_centre(extract)
        + rule4_incomplete_data(extract)
        + rule5_invalid_data(extract, dept_set, cc_set)
        + rule6_allowance_missing_amount(extract)
        + rule7_negative_zero_payment(extract)
        + rule8_department_mismatch(extract, emp_map)
    )

    # Clear existing flags for this pay period
    extract_ids = [r.Record_ID for r in extract]
    if extract_ids:
        db.query(Flagged_Results).filter(Flagged_Results.Record_ID.in_(extract_ids)).delete(synchronize_session=False)

    # Insert new flags
    if all_flags:
        db.bulk_save_objects([Flagged_Results(**f) for f in all_flags])

    db.commit()

    dq_score = rule9_dq_score(extract, all_flags)
    report_marker = rule10_scheduled_report_marker(import_log, pay_period)

    flag_summary: dict[str, int] = {}
    for f in all_flags:
        flag_summary[f["Flag_Type"]] = flag_summary.get(f["Flag_Type"], 0) + 1

    return {
        "payPeriod": pay_period,
        "totalExtractRows": len(extract),
        "totalFlagsInserted": len(all_flags),
        "dqScore": dq_score,
        "reportMarker": report_marker,
        "flagSummary": flag_summary,
    }


def get_flags(db: Session, pay_period: str):
    ids = [
        r.Record_ID
        for r in db.query(Payroll_Extract.Record_ID)
        .filter(Payroll_Extract.Pay_Period == pay_period)
        .all()
    ]
    if not ids:
        return []
    return (
        db.query(Flagged_Results)
        .filter(Flagged_Results.Record_ID.in_(ids))
        .order_by(Flagged_Results.Flag_ID)
        .all()
    )


def get_dq_score(db: Session, pay_period: str) -> dict:
    extract = db.query(Payroll_Extract).filter(Payroll_Extract.Pay_Period == pay_period).all()
    ids = [r.Record_ID for r in extract]
    flags = (
        db.query(Flagged_Results).filter(Flagged_Results.Record_ID.in_(ids)).all()
        if ids else []
    )
    flagged_ids = {f.Record_ID for f in flags}
    flag_dicts = [{"Record_ID": f.Record_ID} for f in flags]
    return {
        "payPeriod": pay_period,
        "totalRows": len(extract),
        "flaggedRows": len(flagged_ids),
        "dqScore": rule9_dq_score(extract, flag_dicts),
    }
