import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rule1DuplicatePayment } from './rules/rule1-duplicate-payment';
import { rule2OutOfRangeHours } from './rules/rule2-out-of-range-hours';
import { rule3MissingCostCentre } from './rules/rule3-missing-cost-centre';
import { rule4IncompleteData } from './rules/rule4-incomplete-data';
import { rule5InvalidData } from './rules/rule5-invalid-data';
import { rule6AllowanceMissingAmount } from './rules/rule6-allowance-missing-amount';
import { rule7NegativeZeroPayment } from './rules/rule7-negative-zero-payment';
import { rule8DepartmentMismatch } from './rules/rule8-department-mismatch';
import { rule9DqScore } from './rules/rule9-dq-score';
import { rule10ScheduledReportMarker } from './rules/rule10-scheduled-report-marker';
import { RuleInput } from './rules.types';

export interface RulesResult {
  payPeriod: string;
  totalExtractRows: number;
  totalFlagsInserted: number;
  dqScore: number;
  reportMarker: {
    hasImportLog: boolean;
    importedAt: Date | null;
    rowCount: number | null;
  };
  flagSummary: Record<string, number>;
}

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  async runAllRules(payPeriod: string): Promise<RulesResult> {
    // Load all data in one parallel batch — avoids N+1 queries per rule
    const [extract, attendance, departments, costCentres, empDepts, ruleValues, importLog] =
      await Promise.all([
        this.prisma.payroll_Extract.findMany({ where: { Pay_Period: payPeriod } }),
        this.prisma.attendance_History.findMany({ where: { Import_Month: payPeriod } }),
        this.prisma.valid_Departments.findMany(),
        this.prisma.valid_Cost_Centres.findMany(),
        this.prisma.employee_Department_Master.findMany(),
        this.prisma.company_Master_Rules.findMany(),
        this.prisma.import_Log.findMany({ where: { Import_Month: payPeriod } }),
      ]);

    const deptSet = new Set(departments.map((d) => d.Department));
    const ccSet = new Set(costCentres.map((c) => c.Cost_Centre_Code));
    const empMap = new Map(empDepts.map((e) => [e.Employee_ID, e.Official_Department]));
    const rulesMap = new Map(ruleValues.map((r) => [r.Rule_Name, r.Value]));

    const input: RuleInput = {
      payPeriod,
      extract: extract as any,
      attendance: attendance as any,
      departments: deptSet,
      costCentres: ccSet,
      employeeDeptMap: empMap,
      rules: rulesMap,
      importLog,
    };

    // Run rules 1–8 in sequence (each is a pure function)
    const allFlags: Prisma.Flagged_ResultsCreateManyInput[] = [
      ...rule1DuplicatePayment(input),
      ...rule2OutOfRangeHours(input),
      ...rule3MissingCostCentre(input),
      ...rule4IncompleteData(input),
      ...rule5InvalidData(input),
      ...rule6AllowanceMissingAmount(input),
      ...rule7NegativeZeroPayment(input),
      ...rule8DepartmentMismatch(input),
    ];

    // Clear existing flags for this pay period, then insert the new ones
    const extractIds = extract.map((r) => r.Record_ID);
    if (extractIds.length > 0) {
      await this.prisma.flagged_Results.deleteMany({
        where: { Record_ID: { in: extractIds } },
      });
    }
    if (allFlags.length > 0) {
      await this.prisma.flagged_Results.createMany({ data: allFlags });
    }

    // Rule 9: Data Quality Score (computed, not stored as flag)
    const dqScore = rule9DqScore(extract, allFlags);

    // Rule 10: Report marker (checks Import_Log)
    const reportMarker = rule10ScheduledReportMarker(importLog, payPeriod);

    // Build a flag-type summary for the dashboard
    const flagSummary: Record<string, number> = {};
    for (const flag of allFlags) {
      flagSummary[flag.Flag_Type] = (flagSummary[flag.Flag_Type] ?? 0) + 1;
    }

    return {
      payPeriod,
      totalExtractRows: extract.length,
      totalFlagsInserted: allFlags.length,
      dqScore,
      reportMarker,
      flagSummary,
    };
  }

  async getFlags(payPeriod: string) {
    const extract = await this.prisma.payroll_Extract.findMany({
      where: { Pay_Period: payPeriod },
      select: { Record_ID: true },
    });
    const ids = extract.map((r) => r.Record_ID);
    if (ids.length === 0) return [];

    return this.prisma.flagged_Results.findMany({
      where: { Record_ID: { in: ids } },
      orderBy: { Flag_ID: 'asc' },
    });
  }

  async getDqScore(payPeriod: string): Promise<{ dqScore: number; payPeriod: string; totalRows: number; flaggedRows: number }> {
    const extract = await this.prisma.payroll_Extract.findMany({
      where: { Pay_Period: payPeriod },
    });
    const ids = extract.map((r) => r.Record_ID);
    const flags =
      ids.length > 0
        ? await this.prisma.flagged_Results.findMany({ where: { Record_ID: { in: ids } } })
        : [];

    const flaggedIds = new Set(flags.map((f) => f.Record_ID));

    return {
      payPeriod,
      totalRows: extract.length,
      flaggedRows: flaggedIds.size,
      dqScore: rule9DqScore(extract, flags),
    };
  }
}
