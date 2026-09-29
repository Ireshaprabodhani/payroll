import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 4 — Incomplete Data
 * On 'Ordinary' rows only: flags if Department is null/blank,
 * Hours_Worked is null, or Pay_Amount is null.
 * Each missing field produces a separate flag entry.
 */
export function rule4IncompleteData(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];

  for (const row of input.extract) {
    if (row.Pay_Type !== 'Ordinary') continue;

    if (!row.Department || row.Department.trim() === '') {
      flags.push({
        Record_ID: row.Record_ID,
        Flag_Type: 'INCOMPLETE_DEPARTMENT',
        Severity: 'ERROR',
        Description: `Ordinary row for Employee ${row.Employee_ID} is missing Department.`,
      });
    }

    if (row.Hours_Worked === null || row.Hours_Worked === undefined) {
      flags.push({
        Record_ID: row.Record_ID,
        Flag_Type: 'INCOMPLETE_HOURS_WORKED',
        Severity: 'ERROR',
        Description: `Ordinary row for Employee ${row.Employee_ID} has null Hours_Worked ` +
          `(no complete punch pair found — punch error, not a genuine zero).`,
      });
    }

    if (row.Pay_Amount === null || row.Pay_Amount === undefined) {
      flags.push({
        Record_ID: row.Record_ID,
        Flag_Type: 'INCOMPLETE_PAY_AMOUNT',
        Severity: 'ERROR',
        Description: `Ordinary row for Employee ${row.Employee_ID} has null Pay_Amount ` +
          `(cannot be computed — check punch data and pay rate).`,
      });
    }
  }

  return flags;
}
