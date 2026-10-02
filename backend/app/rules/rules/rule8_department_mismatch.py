"""
Rule 8 — Department Mismatch
Compares Payroll_Extract.Department against Employee_Department_Master.Official_Department.
Only fires when BOTH values are present and they differ.
"""


def rule8_department_mismatch(extract: list, emp_dept_map: dict) -> list:
    flags = []

    for row in extract:
        official = emp_dept_map.get(row.Employee_ID)
        if not official:
            continue
        if not row.Department or row.Department.strip() == "":
            continue
        if row.Department.strip() != official.strip():
            flags.append({
                "Record_ID": row.Record_ID,
                "Flag_Type": "DEPARTMENT_MISMATCH",
                "Severity": "WARNING",
                "Description": (
                    f"Employee {row.Employee_ID}: attendance Department is '{row.Department}' "
                    f"but Employee_Department_Master shows '{official}'. "
                    f"Possible data-entry error or unauthorised department transfer."
                ),
            })

    return flags
