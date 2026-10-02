"""
Seed script: populates default reference data and users.
Run with: python -m app.seed
"""
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Company_Master_Rules, Valid_Departments, Valid_Cost_Centres, Users
from app.auth.service import hash_password


def upsert_rule(db: Session, name: str, value: float, desc: str):
    existing = db.query(Company_Master_Rules).filter(Company_Master_Rules.Rule_Name == name).first()
    if existing:
        existing.Value = value
        existing.Description = desc
    else:
        db.add(Company_Master_Rules(Rule_Name=name, Value=value, Description=desc))


def upsert_dept(db: Session, dept: str):
    if not db.query(Valid_Departments).filter(Valid_Departments.Department == dept).first():
        db.add(Valid_Departments(Department=dept))


def upsert_cc(db: Session, code: str, desc: str):
    existing = db.query(Valid_Cost_Centres).filter(Valid_Cost_Centres.Cost_Centre_Code == code).first()
    if existing:
        existing.Description = desc
    else:
        db.add(Valid_Cost_Centres(Cost_Centre_Code=code, Description=desc))


def upsert_user(db: Session, username: str, password: str, role: str, department: str | None = None):
    existing = db.query(Users).filter(Users.Username == username).first()
    if existing:
        existing.Password = hash_password(password)
        existing.Role = role
        existing.Department = department
    else:
        db.add(Users(Username=username, Password=hash_password(password), Role=role, Department=department))


def main():
    db: Session = SessionLocal()
    try:
        print("Seeding Company_Master_Rules...")
        upsert_rule(db, "Standard_Monthly_Hours", 165, "38 hours x 4.33 weeks")
        upsert_rule(db, "Max_Monthly_Hours", 260, "60 hours x 4.33 weeks")
        upsert_rule(db, "Min_Monthly_Hours", 0, "Casual/no shifts; negative is invalid")
        upsert_rule(db, "Max_Daily_Hours", 12, "Checked per punch pair; a 14-hour day is wrong")
        upsert_rule(db, "Overtime_Threshold", 165, "Hours above 165 in the month")

        print("Seeding Valid_Departments...")
        for dept in ["HR", "Finance", "Payroll", "Manufacturing", "Warehouse", "Sales", "IT", "Executive"]:
            upsert_dept(db, dept)

        print("Seeding Valid_Cost_Centres...")
        centres = [
            ("CC-100", "Payroll & HR"),
            ("CC-110", "Finance"),
            ("CC-200", "Manufacturing"),
            ("CC-210", "Warehouse"),
            ("CC-300", "Sales"),
            ("CC-400", "IT"),
            ("CC-500", "Executive"),
        ]
        for code, desc in centres:
            upsert_cc(db, code, desc)

        print("Seeding Users...")
        upsert_user(db, "admin", "admin123", "Admin")
        upsert_user(db, "payroll_manager", "payroll123", "Payroll Manager")
        upsert_user(db, "executive", "executive123", "Executive")
        upsert_user(db, "end_user", "enduser123", "End User", "Finance")
        upsert_user(db, "hr_user", "hr123", "End User", "HR")

        db.commit()
        print("Seed complete.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
