"""
Rule 6 — Allowance Missing Amount
Flags any Payroll_Extract row where Pay_Type is 'Allowance'
and Pay_Amount is null or zero.
"""


def rule6_allowance_missing_amount(extract: list) -> list:
    return [
        {
            "Record_ID": row.Record_ID,
            "Flag_Type": "ALLOWANCE_MISSING_AMOUNT",
            "Severity": "WARNING",
            "Description": (
                f"Allowance row for Employee {row.Employee_ID} (Record_ID {row.Record_ID}) "
                f"has null or zero Pay_Amount. Allowance records must always carry a Pay_Amount."
            ),
        }
        for row in extract
        if row.Pay_Type == "Allowance"
        and (row.Pay_Amount is None or float(row.Pay_Amount) == 0)
    ]
