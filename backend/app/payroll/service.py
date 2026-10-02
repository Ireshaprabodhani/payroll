from datetime import datetime, time
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models import Attendance_History, Employee_Pay_Rate, Payroll_Extract, Flagged_Results


def _time_to_seconds(t: time) -> int:
    return t.hour * 3600 + t.minute * 60 + t.second


def calculate_payroll(db: Session, pay_period: str):
    attendance = (
        db.query(Attendance_History)
        .filter(Attendance_History.Import_Month == pay_period)
        .all()
    )

    # Group by Employee_ID
    by_employee: dict[str, list] = {}
    for row in attendance:
        by_employee.setdefault(row.Employee_ID, []).append(row)

    emp_ids = list(by_employee.keys())
    rates = db.query(Employee_Pay_Rate).filter(Employee_Pay_Rate.Employee_ID.in_(emp_ids)).all()
    rate_map = {r.Employee_ID: r.Hourly_Rate for r in rates}

    # Delete existing Generated rows for this period (idempotent)
    db.query(Payroll_Extract).filter(
        Payroll_Extract.Pay_Period == pay_period,
        Payroll_Extract.Source == "Generated",
    ).delete(synchronize_session=False)
    db.commit()

    rows = []
    for emp_id, punches in by_employee.items():
        total_seconds = None
        has_complete_pair = False

        for p in punches:
            if p.Punch_In is not None and p.Punch_Out is not None:
                has_complete_pair = True
                diff = _time_to_seconds(p.Punch_Out) - _time_to_seconds(p.Punch_In)
                total_seconds = (total_seconds or 0) + diff

        hours_worked = None
        if has_complete_pair and total_seconds is not None:
            hours_worked = Decimal(str(round(total_seconds / 3600, 4)))

        hourly_rate = rate_map.get(emp_id)
        pay_amount = None
        if hours_worked is not None and hourly_rate is not None:
            pay_amount = Decimal(str(round(float(hours_worked) * float(hourly_rate), 2)))

        first = punches[0]
        rows.append(Payroll_Extract(
            Employee_ID=emp_id,
            Department=first.Department,
            Cost_Centre=first.Cost_Centre,
            Pay_Period=pay_period,
            Pay_Type="Ordinary",
            Hours_Worked=hours_worked,
            Pay_Amount=pay_amount,
            Source="Generated",
        ))

    db.bulk_save_objects(rows)
    db.commit()

    return {"generated": len(rows), "payPeriod": pay_period}


def seed_dirty_data(db: Session, pay_period: str):
    already_seeded = db.query(Payroll_Extract).filter(
        Payroll_Extract.Pay_Period == pay_period,
        Payroll_Extract.Source == "Seeded-Dirty",
    ).count()

    if already_seeded > 0:
        return {"seeded": 0, "skipped": True}

    existing = (
        db.query(Payroll_Extract)
        .filter(
            Payroll_Extract.Pay_Period == pay_period,
            Payroll_Extract.Pay_Type == "Ordinary",
            Payroll_Extract.Source == "Generated",
        )
        .limit(3)
        .all()
    )

    if not existing:
        return {"seeded": 0, "skipped": False}

    dirty_rows = []

    # Rule 1 trigger: exact duplicates
    for r in existing:
        dirty_rows.append(Payroll_Extract(
            Employee_ID=r.Employee_ID,
            Department=r.Department,
            Cost_Centre=r.Cost_Centre,
            Pay_Period=r.Pay_Period,
            Pay_Type=r.Pay_Type,
            Hours_Worked=r.Hours_Worked,
            Pay_Amount=r.Pay_Amount,
            Source="Seeded-Dirty",
        ))

    # Rule 6 trigger: Allowance rows with no Pay_Amount
    for r in existing[:2]:
        dirty_rows.append(Payroll_Extract(
            Employee_ID=r.Employee_ID,
            Department=r.Department,
            Cost_Centre=r.Cost_Centre,
            Pay_Period=r.Pay_Period,
            Pay_Type="Allowance",
            Hours_Worked=None,
            Pay_Amount=None,
            Source="Seeded-Dirty",
        ))

    db.bulk_save_objects(dirty_rows)
    db.commit()

    return {"seeded": len(dirty_rows), "skipped": False}


def get_extract(db: Session, pay_period: str):
    return (
        db.query(Payroll_Extract)
        .filter(Payroll_Extract.Pay_Period == pay_period)
        .order_by(Payroll_Extract.Employee_ID, Payroll_Extract.Pay_Type)
        .all()
    )


def process_payroll(db: Session, pay_period: str):
    calc = calculate_payroll(db, pay_period)
    seed = seed_dirty_data(db, pay_period)
    # import here to avoid circular import
    from app.rules.service import run_all_rules
    rules = run_all_rules(db, pay_period)
    return {**calc, **seed, **rules}
