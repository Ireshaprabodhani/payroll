"""
Rule 5 — Invalid Data
Flags rows where Cost_Centre is not in Valid_Cost_Centres,
or Department is not in Valid_Departments.
Only checks non-null/non-blank values (null values are caught by Rules 3 and 4).
"""


def rule5_invalid_data(extract: list, departments: set, cost_centres: set) -> list:
    flags = []

    for row in extract:
        if row.Cost_Centre and row.Cost_Centre.strip():
            if row.Cost_Centre.strip() not in cost_centres:
                flags.append({
                    "Record_ID": row.Record_ID,
                    "Flag_Type": "INVALID_COST_CENTRE",
                    "Severity": "ERROR",
                    "Description": (
                        f"Employee {row.Employee_ID}: Cost_Centre '{row.Cost_Centre}' "
                        f"is not in the Valid_Cost_Centres reference table."
                    ),
                })

        if row.Department and row.Department.strip():
            if row.Department.strip() not in departments:
                flags.append({
                    "Record_ID": row.Record_ID,
                    "Flag_Type": "INVALID_DEPARTMENT",
                    "Severity": "ERROR",
                    "Description": (
                        f"Employee {row.Employee_ID}: Department '{row.Department}' "
                        f"is not in the Valid_Departments reference table."
                    ),
                })

    return flags
