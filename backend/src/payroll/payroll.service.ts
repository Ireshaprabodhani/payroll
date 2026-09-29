import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
  ) {}

  /**
   * calculatePayroll
   * For each employee with attendance punches in the given payPeriod:
   *  - Sums (Punch_Out - Punch_In) across all COMPLETE punch pairs (both non-null).
   *  - Negative durations pass through as-is (Punch_Out < Punch_In is a real data error).
   *  - If an employee has NO complete punch pairs at all → Hours_Worked = NULL (not 0).
   *  - Pay_Amount = Hours_Worked × Hourly_Rate (NULL if either is unavailable).
   *  - Department and Cost_Centre are taken from attendance, NEVER overwritten from master data.
   * Before inserting, deletes existing Generated rows for this pay period (idempotent).
   */
  async calculatePayroll(payPeriod: string): Promise<{ generated: number; payPeriod: string }> {
    const attendance = await this.prisma.attendance_History.findMany({
      where: { Import_Month: payPeriod },
    });

    // Group attendance by Employee_ID
    const byEmployee = new Map<string, typeof attendance>();
    for (const row of attendance) {
      const list = byEmployee.get(row.Employee_ID) ?? [];
      list.push(row);
      byEmployee.set(row.Employee_ID, list);
    }

    // Load pay rates in one query
    const empIds = [...byEmployee.keys()];
    const rates = await this.prisma.employee_Pay_Rate.findMany({
      where: { Employee_ID: { in: empIds } },
    });
    const rateMap = new Map(rates.map((r) => [r.Employee_ID, r.Hourly_Rate]));

    // Delete existing Generated rows for this pay period (idempotent)
    await this.prisma.payroll_Extract.deleteMany({
      where: { Pay_Period: payPeriod, Source: 'Generated' },
    });

    const rows: Prisma.Payroll_ExtractCreateManyInput[] = [];

    for (const [employeeId, punches] of byEmployee.entries()) {
      let totalMinutes: number | null = null;
      let hasAnyCompletePair = false;

      for (const punch of punches) {
        if (punch.Punch_In && punch.Punch_Out) {
          hasAnyCompletePair = true;
          const diffMinutes =
            (punch.Punch_Out.getTime() - punch.Punch_In.getTime()) / 60_000;
          totalMinutes = (totalMinutes ?? 0) + diffMinutes;
        }
        // Punch with missing Punch_Out: contributes nothing to total
        // If all punches are incomplete, hasAnyCompletePair stays false
      }

      // NULL when no complete pairs; genuine numeric (possibly negative) otherwise
      const hoursWorked =
        hasAnyCompletePair && totalMinutes !== null
          ? new Prisma.Decimal(totalMinutes / 60)
          : null;

      const hourlyRate = rateMap.get(employeeId) ?? null;
      const payAmount =
        hoursWorked !== null && hourlyRate !== null
          ? new Prisma.Decimal(hoursWorked.toNumber() * hourlyRate.toNumber())
          : null;

      // Department and Cost_Centre: from the first attendance row (spec requirement)
      const first = punches[0];

      rows.push({
        Employee_ID: employeeId,
        Department: first.Department,
        Cost_Centre: first.Cost_Centre,
        Pay_Period: payPeriod,
        Pay_Type: 'Ordinary',
        Hours_Worked: hoursWorked,
        Pay_Amount: payAmount,
        Source: 'Generated',
      });
    }

    if (rows.length > 0) {
      await this.prisma.payroll_Extract.createMany({ data: rows });
    }

    return { generated: rows.length, payPeriod };
  }

  /**
   * seedDirtyData
   * Duplicates a few Generated Ordinary rows (triggering Rule 1)
   * and adds Allowance rows with null Pay_Amount (triggering Rule 6).
   * Idempotent: skips if Source='Seeded-Dirty' rows already exist for this period.
   */
  async seedDirtyData(payPeriod: string): Promise<{ seeded: number; skipped: boolean }> {
    const alreadySeeded = await this.prisma.payroll_Extract.count({
      where: { Pay_Period: payPeriod, Source: 'Seeded-Dirty' },
    });
    if (alreadySeeded > 0) {
      return { seeded: 0, skipped: true };
    }

    const existingRows = await this.prisma.payroll_Extract.findMany({
      where: { Pay_Period: payPeriod, Pay_Type: 'Ordinary', Source: 'Generated' },
      take: 3,
    });

    if (existingRows.length === 0) {
      return { seeded: 0, skipped: false };
    }

    // Rule 1 trigger: exact duplicates
    const duplicates: Prisma.Payroll_ExtractCreateManyInput[] = existingRows.map((r) => ({
      Employee_ID: r.Employee_ID,
      Department: r.Department,
      Cost_Centre: r.Cost_Centre,
      Pay_Period: r.Pay_Period,
      Pay_Type: r.Pay_Type,
      Hours_Worked: r.Hours_Worked,
      Pay_Amount: r.Pay_Amount,
      Source: 'Seeded-Dirty',
    }));

    // Rule 6 trigger: Allowance rows with no Pay_Amount
    const allowanceRows: Prisma.Payroll_ExtractCreateManyInput[] = existingRows
      .slice(0, 2)
      .map((r) => ({
        Employee_ID: r.Employee_ID,
        Department: r.Department,
        Cost_Centre: r.Cost_Centre,
        Pay_Period: r.Pay_Period,
        Pay_Type: 'Allowance',
        Hours_Worked: null,
        Pay_Amount: null,
        Source: 'Seeded-Dirty',
      }));

    const allDirty = [...duplicates, ...allowanceRows];
    await this.prisma.payroll_Extract.createMany({ data: allDirty });

    return { seeded: allDirty.length, skipped: false };
  }

  async getExtract(payPeriod: string) {
    return this.prisma.payroll_Extract.findMany({
      where: { Pay_Period: payPeriod },
      orderBy: [{ Employee_ID: 'asc' }, { Pay_Type: 'asc' }],
    });
  }

  /**
   * processPayroll
   * Full pipeline: calculate → seed dirty → run all rules.
   * Useful for a single end-to-end call.
   */
  async processPayroll(payPeriod: string) {
    const calcResult = await this.calculatePayroll(payPeriod);
    const seedResult = await this.seedDirtyData(payPeriod);
    const rulesResult = await this.rulesService.runAllRules(payPeriod);
    return { ...calcResult, ...seedResult, ...rulesResult };
  }
}
