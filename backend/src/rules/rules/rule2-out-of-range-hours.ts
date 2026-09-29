import { Prisma } from '@prisma/client';
import { RuleInput } from '../rules.types';

/**
 * Rule 2 — Out-of-Range Hours
 * Two separate checks:
 * A) Monthly: sum Hours_Worked per employee (Ordinary rows). Flag if > Max_Monthly_Hours or < Min_Monthly_Hours.
 * B) Daily: from Attendance_History, compute each employee's total hours per date.
 *    Flag if any single day exceeds Max_Daily_Hours.
 */
export function rule2OutOfRangeHours(
  input: RuleInput,
): Prisma.Flagged_ResultsCreateManyInput[] {
  const maxMonthly = Number(input.rules.get('Max_Monthly_Hours') ?? 260);
  const minMonthly = Number(input.rules.get('Min_Monthly_Hours') ?? 0);
  const maxDaily = Number(input.rules.get('Max_Daily_Hours') ?? 12);

  const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];

  // --- A) Monthly check ---
  const monthlyByEmployee = new Map<string, { totalHours: number; recordIds: number[] }>();

  for (const row of input.extract) {
    if (row.Pay_Type !== 'Ordinary') continue;
    if (row.Hours_Worked === null || row.Hours_Worked === undefined) continue;

    const empData = monthlyByEmployee.get(row.Employee_ID) ?? { totalHours: 0, recordIds: [] };
    empData.totalHours += Number(row.Hours_Worked);
    empData.recordIds.push(row.Record_ID);
    monthlyByEmployee.set(row.Employee_ID, empData);
  }

  for (const [empId, data] of monthlyByEmployee.entries()) {
    if (data.totalHours > maxMonthly) {
      for (const rid of data.recordIds) {
        flags.push({
          Record_ID: rid,
          Flag_Type: 'OUT_OF_RANGE_MONTHLY_HOURS_HIGH',
          Severity: 'WARNING',
          Description: `Employee ${empId} has ${data.totalHours.toFixed(2)} monthly hours, ` +
            `exceeding Max_Monthly_Hours of ${maxMonthly}.`,
        });
      }
    } else if (data.totalHours < minMonthly) {
      for (const rid of data.recordIds) {
        flags.push({
          Record_ID: rid,
          Flag_Type: 'OUT_OF_RANGE_MONTHLY_HOURS_LOW',
          Severity: 'WARNING',
          Description: `Employee ${empId} has ${data.totalHours.toFixed(2)} monthly hours, ` +
            `below Min_Monthly_Hours of ${minMonthly}.`,
        });
      }
    }
  }

  // --- B) Daily check (from Attendance_History) ---
  const dailyHoursByKey = new Map<string, number>(); // key: "EmpID|YYYY-MM-DD"

  for (const att of input.attendance) {
    if (!att.Punch_In || !att.Punch_Out) continue;
    const dayStr = att.Punch_Date instanceof Date
      ? att.Punch_Date.toISOString().slice(0, 10)
      : String(att.Punch_Date).slice(0, 10);
    const key = `${att.Employee_ID}|${dayStr}`;
    const diffHours = (att.Punch_Out.getTime() - att.Punch_In.getTime()) / 3_600_000;
    dailyHoursByKey.set(key, (dailyHoursByKey.get(key) ?? 0) + diffHours);
  }

  for (const [key, dailyHours] of dailyHoursByKey.entries()) {
    if (dailyHours > maxDaily) {
      const [empId, dayStr] = key.split('|');
      // Attach to all Ordinary extract rows for this employee
      const relatedRows = input.extract.filter(
        (r) => r.Employee_ID === empId && r.Pay_Type === 'Ordinary',
      );
      for (const row of relatedRows) {
        flags.push({
          Record_ID: row.Record_ID,
          Flag_Type: 'OUT_OF_RANGE_DAILY_HOURS',
          Severity: 'WARNING',
          Description: `Employee ${empId} worked ${dailyHours.toFixed(2)} hours on ${dayStr}, ` +
            `exceeding Max_Daily_Hours of ${maxDaily}.`,
        });
      }
    }
  }

  return flags;
}
