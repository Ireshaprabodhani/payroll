"""
Rule 3 — Missing Cost Centre
Flags any Payroll_Extract row where Cost_Centre is null or an empty string.
"""


def rule3_missing_cost_centre(extract: list) -> list:
    return [
        {
            "Record_ID": row.Record_ID,
            "Flag_Type": "MISSING_COST_CENTRE",
            "Severity": "ERROR",
            "Description": f"Employee {row.Employee_ID} (Record_ID {row.Record_ID}) has no Cost_Centre value.",
        }
        for row in extract
        if not row.Cost_Centre or row.Cost_Centre.strip() == ""
    ]
