"""
Rule 9 — Data Quality Score
Computes the percentage of clean Payroll_Extract rows (rows with no flags).
Formula: (clean_records / total_records) * 100
Returns 100.0 when the extract is empty.
"""


def rule9_dq_score(extract: list, all_flags: list) -> float:
    total = len(extract)
    if total == 0:
        return 100.0

    flagged_ids = {f["Record_ID"] for f in all_flags}
    clean = total - len(flagged_ids)
    return round((clean / total) * 100, 2)
