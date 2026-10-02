"""
Rule 1 — Duplicate Payment
Flags any Payroll_Extract row that is an exact duplicate of a previously seen row
for the same Employee_ID + Pay_Period + Pay_Type + Hours_Worked + Pay_Amount.
The first occurrence is kept clean; all subsequent occurrences are flagged ERROR.
"""


def rule1_duplicate_payment(extract: list) -> list:
    seen: dict[str, int] = {}
    flags = []

    for row in extract:
        key = "|".join([
            row.Employee_ID,
            row.Pay_Period,
            row.Pay_Type,
            str(row.Hours_Worked) if row.Hours_Worked is not None else "NULL",
            str(row.Pay_Amount) if row.Pay_Amount is not None else "NULL",
        ])

        if key in seen:
            flags.append({
                "Record_ID": row.Record_ID,
                "Flag_Type": "DUPLICATE_PAYMENT",
                "Severity": "ERROR",
                "Description": (
                    f"Duplicate payment record detected for Employee {row.Employee_ID} "
                    f"in {row.Pay_Period}. Same Pay_Type, Hours_Worked, and Pay_Amount "
                    f"as Record_ID {seen[key]}."
                ),
            })
        else:
            seen[key] = row.Record_ID

    return flags
