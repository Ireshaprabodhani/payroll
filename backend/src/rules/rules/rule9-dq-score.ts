import { Prisma } from '@prisma/client';

/**
 * Rule 9 — Data Quality Score
 * Computes the percentage of "clean" Payroll_Extract rows (rows with no flags).
 * Formula: (clean_records / total_records) × 100
 * This rule does NOT produce Flagged_Results rows — it returns a numeric score.
 * Returns 100.00 when the extract is empty (no data to be dirty).
 */
export function rule9DqScore(
  extract: { Record_ID: number }[],
  allFlags: Prisma.Flagged_ResultsCreateManyInput[],
): number {
  const total = extract.length;
  if (total === 0) return 100.0;

  const flaggedIds = new Set(allFlags.map((f) => f.Record_ID));
  const clean = total - flaggedIds.size;

  return Math.round((clean / total) * 100 * 100) / 100; // round to 2 decimal places
}
