import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 1 — Duplicate Payment
 * Flags any Payroll_Extract row that is an exact duplicate of a previously seen row
 * for the same Employee_ID + Pay_Period + Pay_Type + Hours_Worked + Pay_Amount.
 * The first occurrence is kept clean; all subsequent occurrences are flagged ERROR.
 */
export function rule1DuplicatePayment(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  const seen = new Map<string, number>();
  const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];

  for (const row of input.extract) {
    const key = [
      row.Employee_ID,
      row.Pay_Period,
      row.Pay_Type,
      row.Hours_Worked?.toString() ?? 'NULL',
      row.Pay_Amount?.toString() ?? 'NULL',
    ].join('|');

    if (seen.has(key)) {
      flags.push({
        Record_ID: row.Record_ID,
        Flag_Type: 'DUPLICATE_PAYMENT',
        Severity: 'ERROR',
        Description: `Duplicate payment record detected for Employee ${row.Employee_ID} in ${row.Pay_Period}. ` +
          `Same Pay_Type, Hours_Worked, and Pay_Amount as Record_ID ${seen.get(key)}.`,
      });
    } else {
      seen.set(key, row.Record_ID);
    }
  }

  return flags;
}
