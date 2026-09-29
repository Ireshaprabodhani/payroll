/**
 * Rule 10 — Scheduled Report Marker
 * Checks whether an Import_Log entry exists for the given pay period.
 * If it exists, the month has been formally imported and a report can be generated.
 * This rule does NOT produce Flagged_Results rows — it returns metadata.
 */
export function rule10ScheduledReportMarker(
  importLog: { Import_Month: string; Imported_At: Date; Row_Count: number }[],
  payPeriod: string,
): { hasImportLog: boolean; importedAt: Date | null; rowCount: number | null } {
  const entry = importLog.find((l) => l.Import_Month === payPeriod);
  return {
    hasImportLog: !!entry,
    importedAt: entry?.Imported_At ?? null,
    rowCount: entry?.Row_Count ?? null,
  };
}
