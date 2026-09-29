import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 5 — Invalid Data
 * Flags rows where Cost_Centre is not in Valid_Cost_Centres,
 * or Department is not in Valid_Departments.
 * Only checks non-null/non-blank values (null values are caught by Rules 3 and 4).
 */
export function rule5InvalidData(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];

  for (const row of input.extract) {
    if (row.Cost_Centre && row.Cost_Centre.trim() !== '') {
      if (!input.costCentres.has(row.Cost_Centre.trim())) {
        flags.push({
          Record_ID: row.Record_ID,
          Flag_Type: 'INVALID_COST_CENTRE',
          Severity: 'ERROR',
          Description: `Employee ${row.Employee_ID}: Cost_Centre '${row.Cost_Centre}' ` +
            `is not in the Valid_Cost_Centres reference table.`,
        });
      }
    }

    if (row.Department && row.Department.trim() !== '') {
      if (!input.departments.has(row.Department.trim())) {
        flags.push({
          Record_ID: row.Record_ID,
          Flag_Type: 'INVALID_DEPARTMENT',
          Severity: 'ERROR',
          Description: `Employee ${row.Employee_ID}: Department '${row.Department}' ` +
            `is not in the Valid_Departments reference table.`,
        });
      }
    }
  }

  return flags;
}
