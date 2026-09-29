import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query('payPeriod') payPeriod: string, @Request() req: any) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');

    const { role, department } = req.user as { role: string; username: string; department: string | null };

    // End User: scoped to their own department stored in the JWT
    let deptFilter: string | undefined;
    if (role === 'End User') {
      if (!department) {
        throw new BadRequestException('End User account has no department assigned. Contact an administrator.');
      }
      deptFilter = department;
    }

    // Admin, Payroll Manager: full organisation view (deptFilter remains undefined)
    return this.dashboardService.getSummary(payPeriod, deptFilter);
  }

  @Get('summary/department')
  getDepartmentSummary(
    @Query('payPeriod') payPeriod: string,
    @Query('department') department: string,
    @Request() req: any,
  ) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    if (!department) throw new BadRequestException('department query param required');
    return this.dashboardService.getSummary(payPeriod, department);
  }
}
