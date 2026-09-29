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

    const { role, username } = req.user as { role: string; username: string };

    // End User: can only see their own department (set a dept filter based on their profile)
    // For now, End User gets no access to dashboard — Admin/Manager/Executive only
    let deptFilter: string | undefined;
    if (role === 'End User') {
      // In a real system you'd look up their department from Employee_Department_Master
      // For now restrict to a placeholder; a proper implementation would join on username
      throw new BadRequestException('End User dashboard access requires department context');
    }

    // Executive, Admin, Payroll Manager: full organisation view
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
