import { BadRequestException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PayrollService } from './payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('calculate')
  @Roles('Admin', 'Payroll Manager')
  calculate(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required (YYYY-MM)');
    return this.payrollService.calculatePayroll(payPeriod);
  }

  @Post('seed-dirty')
  @Roles('Admin')
  seedDirty(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    return this.payrollService.seedDirtyData(payPeriod);
  }

  @Post('process')
  @Roles('Admin', 'Payroll Manager')
  process(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    return this.payrollService.processPayroll(payPeriod);
  }

  @Get('extract')
  @Roles('Admin', 'Payroll Manager', 'Executive')
  getExtract(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    return this.payrollService.getExtract(payPeriod);
  }
}
