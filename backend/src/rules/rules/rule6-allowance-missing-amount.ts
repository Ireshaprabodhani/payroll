import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 6 — Allowance Missing Amount
 * Flags any Payroll_Extract row where Pay_Type is 'Allowance'
 * and Pay_Amount is null or zero.
 */
export function rule6AllowanceMissingAmount(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  return input.extract
    .filter((r) => {
      if (r.Pay_Type !== 'Allowance') return false;
      if (r.Pay_Amount === null || r.Pay_Amount === undefined) return true;
      return Number(r.Pay_Amount) === 0;
    })
    .map((r) => ({
      Record_ID: r.Record_ID,
      Flag_Type: 'ALLOWANCE_MISSING_AMOUNT',
      Severity: 'WARNING',
      Description: `Allowance row for Employee ${r.Employee_ID} (Record_ID ${r.Record_ID}) ` +
        `has null or zero Pay_Amount. Allowance records must always carry a Pay_Amount.`,
    }));
}
