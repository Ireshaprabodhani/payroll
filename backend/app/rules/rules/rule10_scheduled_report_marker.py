"""
Rule 10 — Scheduled Report Marker
Checks whether an Import_Log entry exists for the given pay period.
Does not produce Flagged_Results rows — returns metadata.
"""


def rule10_scheduled_report_marker(import_log: list, pay_period: str) -> dict:
    entry = next((l for l in import_log if l.Import_Month == pay_period), None)
    return {
        "hasImportLog": entry is not None,
        "importedAt": entry.Imported_At if entry else None,
        "rowCount": entry.Row_Count if entry else None,
    }
