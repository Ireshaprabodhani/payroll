import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 7 — Negative or Zero Payment
 * On 'Ordinary' rows: flags if Pay_Amount is not null AND is <= 0.
 * Null Pay_Amount is a separate condition caught by Rule 4.
 * Negative amounts typically indicate a clock error (Punch_Out < Punch_In).
 */
export function rule7NegativeZeroPayment(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  return input.extract
    .filter((r) => {
      if (r.Pay_Type !== 'Ordinary') return false;
      if (r.Pay_Amount === null || r.Pay_Amount === undefined) return false;
      return Number(r.Pay_Amount) <= 0;
    })
    .map((r) => ({
      Record_ID: r.Record_ID,
      Flag_Type: 'NEGATIVE_OR_ZERO_PAYMENT',
      Severity: 'ERROR',
      Description: `Ordinary row for Employee ${r.Employee_ID} has Pay_Amount of ${r.Pay_Amount}, ` +
        `which is ≤ 0. This likely indicates a clock-punch error (Punch_Out before Punch_In).`,
    }));
}
