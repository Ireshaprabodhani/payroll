"""
Rule 2 — Out-of-Range Hours
A) Monthly: sum Hours_Worked per employee (Ordinary rows). Flag if > Max_Monthly_Hours or < Min_Monthly_Hours.
B) Daily: from Attendance_History, compute each employee's total hours per date.
   Flag if any single day exceeds Max_Daily_Hours.
"""
from datetime import time


def _time_to_hours(t: time) -> float:
    return t.hour + t.minute / 60 + t.second / 3600


def rule2_out_of_range_hours(extract: list, attendance: list, rules: dict) -> list:
    max_monthly = float(rules.get("Max_Monthly_Hours", 260))
    min_monthly = float(rules.get("Min_Monthly_Hours", 0))
    max_daily = float(rules.get("Max_Daily_Hours", 12))

    flags = []

    # --- A) Monthly check ---
    monthly: dict[str, dict] = {}
    for row in extract:
        if row.Pay_Type != "Ordinary":
            continue
        if row.Hours_Worked is None:
            continue
        emp = monthly.setdefault(row.Employee_ID, {"total": 0.0, "record_ids": []})
        emp["total"] += float(row.Hours_Worked)
        emp["record_ids"].append(row.Record_ID)

    for emp_id, data in monthly.items():
        if data["total"] > max_monthly:
            for rid in data["record_ids"]:
                flags.append({
                    "Record_ID": rid,
                    "Flag_Type": "OUT_OF_RANGE_MONTHLY_HOURS_HIGH",
                    "Severity": "WARNING",
                    "Description": (
                        f"Employee {emp_id} has {data['total']:.2f} monthly hours, "
                        f"exceeding Max_Monthly_Hours of {max_monthly}."
                    ),
                })
        elif data["total"] < min_monthly:
            for rid in data["record_ids"]:
                flags.append({
                    "Record_ID": rid,
                    "Flag_Type": "OUT_OF_RANGE_MONTHLY_HOURS_LOW",
                    "Severity": "WARNING",
                    "Description": (
                        f"Employee {emp_id} has {data['total']:.2f} monthly hours, "
                        f"below Min_Monthly_Hours of {min_monthly}."
                    ),
                })

    # --- B) Daily check ---
    daily: dict[str, float] = {}
    for att in attendance:
        if att.Punch_In is None or att.Punch_Out is None:
            continue
        day_str = att.Punch_Date.isoformat() if hasattr(att.Punch_Date, "isoformat") else str(att.Punch_Date)[:10]
        key = f"{att.Employee_ID}|{day_str}"
        diff = _time_to_hours(att.Punch_Out) - _time_to_hours(att.Punch_In)
        daily[key] = daily.get(key, 0.0) + diff

    for key, daily_hours in daily.items():
        if daily_hours > max_daily:
            emp_id, day_str = key.split("|", 1)
            related = [r for r in extract if r.Employee_ID == emp_id and r.Pay_Type == "Ordinary"]
            for row in related:
                flags.append({
                    "Record_ID": row.Record_ID,
                    "Flag_Type": "OUT_OF_RANGE_DAILY_HOURS",
                    "Severity": "WARNING",
                    "Description": (
                        f"Employee {emp_id} worked {daily_hours:.2f} hours on {day_str}, "
                        f"exceeding Max_Daily_Hours of {max_daily}."
                    ),
                })

    return flags
