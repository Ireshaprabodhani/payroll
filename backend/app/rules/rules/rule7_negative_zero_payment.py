"""
Rule 7 — Negative or Zero Payment
On 'Ordinary' rows: flags if Pay_Amount is not null AND is <= 0.
Null Pay_Amount is a separate condition caught by Rule 4.
"""


def rule7_negative_zero_payment(extract: list) -> list:
    return [
        {
            "Record_ID": row.Record_ID,
            "Flag_Type": "NEGATIVE_OR_ZERO_PAYMENT",
            "Severity": "ERROR",
            "Description": (
                f"Ordinary row for Employee {row.Employee_ID} has Pay_Amount of {row.Pay_Amount}, "
                f"which is \u2264 0. This likely indicates a clock-punch error (Punch_Out before Punch_In)."
            ),
        }
        for row in extract
        if row.Pay_Type == "Ordinary"
        and row.Pay_Amount is not None
        and float(row.Pay_Amount) <= 0
    ]
