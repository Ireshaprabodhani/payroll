import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 3 — Missing Cost Centre
 * Flags any Payroll_Extract row where Cost_Centre is null or an empty string.
 */
export function rule3MissingCostCentre(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  return input.extract
    .filter((r) => !r.Cost_Centre || r.Cost_Centre.trim() === '')
    .map((r) => ({
      Record_ID: r.Record_ID,
      Flag_Type: 'MISSING_COST_CENTRE',
      Severity: 'ERROR',
      Description: `Employee ${r.Employee_ID} (Record_ID ${r.Record_ID}) has no Cost_Centre value.`,
    }));
}
