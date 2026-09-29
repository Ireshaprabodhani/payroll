import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 8 — Department Mismatch
 * Compares Payroll_Extract.Department against Employee_Department_Master.Official_Department.
 * Only fires when BOTH values are present and they differ.
 * Employees with no master record are silently skipped (no master = can't verify).
 */
export function rule8DepartmentMismatch(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];

  for (const row of input.extract) {
    const officialDept = input.employeeDeptMap.get(row.Employee_ID);
    if (!officialDept) continue; // No master record — cannot compare
    if (!row.Department || row.Department.trim() === '') continue; // Rule 4 handles null/blank

    if (row.Department.trim() !== officialDept.trim()) {
      flags.push({
        Record_ID: row.Record_ID,
        Flag_Type: 'DEPARTMENT_MISMATCH',
        Severity: 'WARNING',
        Description: `Employee ${row.Employee_ID}: attendance Department is '${row.Department}' ` +
          `but Employee_Department_Master shows '${officialDept}'. ` +
          `Possible data-entry error or unauthorised department transfer.`,
      });
    }
  }

  return flags;
}
