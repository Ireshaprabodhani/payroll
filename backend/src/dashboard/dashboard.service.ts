import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rule9DqScore } from '../rules/rules/rule9-dq-score';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(payPeriod: string, departmentFilter?: string) {
    const where: any = { Pay_Period: payPeriod };
    if (departmentFilter) {
      where.Department = departmentFilter;
    }

    const extract = await this.prisma.payroll_Extract.findMany({ where });
    const ids = extract.map((r) => r.Record_ID);

    const flags =
      ids.length > 0
        ? await this.prisma.flagged_Results.findMany({ where: { Record_ID: { in: ids } } })
        : [];

    const dqScore = rule9DqScore(extract, flags);

    // Flag breakdown by type
    const flagBreakdown: Record<string, number> = {};
    for (const f of flags) {
      flagBreakdown[f.Flag_Type] = (flagBreakdown[f.Flag_Type] ?? 0) + 1;
    }

    // Flag breakdown by severity
    const severityBreakdown: Record<string, number> = {};
    for (const f of flags) {
      severityBreakdown[f.Severity] = (severityBreakdown[f.Severity] ?? 0) + 1;
    }

    // Employee count and total pay
    const uniqueEmps = new Set(extract.map((r) => r.Employee_ID)).size;
    const totalPay = extract.reduce((sum, r) => {
      return sum + (r.Pay_Amount ? Number(r.Pay_Amount) : 0);
    }, 0);

    // Import log entries
    const importLog = await this.prisma.import_Log.findMany({
      where: { Import_Month: payPeriod },
      orderBy: { Imported_At: 'desc' },
      take: 1,
    });

    return {
      payPeriod,
      department: departmentFilter ?? 'ALL',
      totalExtractRows: extract.length,
      uniqueEmployees: uniqueEmps,
      totalPayAmount: totalPay.toFixed(2),
      totalFlags: flags.length,
      flaggedRows: new Set(flags.map((f) => f.Record_ID)).size,
      dqScore,
      flagBreakdown,
      severityBreakdown,
      lastImport: importLog[0] ?? null,
    };
  }
}
