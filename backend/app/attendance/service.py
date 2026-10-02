import csv
import io
from datetime import date, time, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Attendance_History, Import_Log


REQUIRED_COLUMNS = ["Employee_ID", "Punch_Date", "Punch_In", "Punch_Out", "Department", "Cost_Centre"]


def _parse_time(value: str) -> time | None:
    """Parse HH:MM or HH:MM:SS string into a time object. Returns None if empty."""
    if not value or value.strip() == "":
        return None
    parts = value.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        h, m = int(parts[0]), int(parts[1])
        s = int(parts[2]) if len(parts) > 2 else 0
        return time(h, m, s)
    except (ValueError, TypeError):
        return None


def upload_attendance(db: Session, file_bytes: bytes, filename: str, import_month: str):
    text = file_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    records = list(reader)

    if not records:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty")

    headers = list(records[0].keys())
    for col in REQUIRED_COLUMNS:
        if col not in headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSV missing required column: {col}",
            )

    # Idempotent: delete existing rows for this month
    db.query(Attendance_History).filter(Attendance_History.Import_Month == import_month).delete()
    db.commit()

    rows = []
    for r in records:
        punch_in = _parse_time(r.get("Punch_In", ""))
        if punch_in is None:
            punch_in = time(0, 0, 0)

        punch_out = _parse_time(r.get("Punch_Out", ""))

        try:
            punch_date = date.fromisoformat(r["Punch_Date"].strip())
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Punch_Date format: {r.get('Punch_Date')}",
            )

        rows.append(Attendance_History(
            Employee_ID=r["Employee_ID"].strip(),
            Punch_Date=punch_date,
            Punch_In=punch_in,
            Punch_Out=punch_out,
            Department=r["Department"].strip(),
            Cost_Centre=r["Cost_Centre"].strip(),
            Source_File=filename,
            Import_Month=import_month,
        ))

    db.bulk_save_objects(rows)

    log = Import_Log(
        Import_Month=import_month,
        Source_File=filename,
        Row_Count=len(records),
        Imported_At=datetime.utcnow(),
    )
    db.add(log)
    db.commit()

    return {"inserted": len(records), "importMonth": import_month}


def get_history(db: Session, import_month: str):
    return (
        db.query(Attendance_History)
        .filter(Attendance_History.Import_Month == import_month)
        .order_by(Attendance_History.Employee_ID, Attendance_History.Punch_Date)
        .all()
    )
