"""
Rule 4 — Incomplete Data
On 'Ordinary' rows only: flags if Department is null/blank,
Hours_Worked is null, or Pay_Amount is null.
Each missing field produces a separate flag entry.
"""


def rule4_incomplete_data(extract: list) -> list:
    flags = []

    for row in extract:
        if row.Pay_Type != "Ordinary":
            continue

        if not row.Department or row.Department.strip() == "":
            flags.append({
                "Record_ID": row.Record_ID,
                "Flag_Type": "INCOMPLETE_DEPARTMENT",
                "Severity": "ERROR",
                "Description": f"Ordinary row for Employee {row.Employee_ID} is missing Department.",
            })

        if row.Hours_Worked is None:
            flags.append({
                "Record_ID": row.Record_ID,
                "Flag_Type": "INCOMPLETE_HOURS_WORKED",
                "Severity": "ERROR",
                "Description": (
                    f"Ordinary row for Employee {row.Employee_ID} has null Hours_Worked "
                    f"(no complete punch pair found — punch error, not a genuine zero)."
                ),
            })

        if row.Pay_Amount is None:
            flags.append({
                "Record_ID": row.Record_ID,
                "Flag_Type": "INCOMPLETE_PAY_AMOUNT",
                "Severity": "ERROR",
                "Description": (
                    f"Ordinary row for Employee {row.Employee_ID} has null Pay_Amount "
                    f"(cannot be computed — check punch data and pay rate)."
                ),
            })

    return flags
