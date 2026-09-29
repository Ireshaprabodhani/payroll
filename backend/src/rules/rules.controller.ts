import { BadRequestException, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RulesService } from './rules.service';

@Controller('rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post('run')
  @Roles('Admin', 'Payroll Manager')
  runRules(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required (YYYY-MM)');
    return this.rulesService.runAllRules(payPeriod);
  }

  @Get('flags')
  @Roles('Admin', 'Payroll Manager', 'Executive')
  getFlags(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    return this.rulesService.getFlags(payPeriod);
  }

  @Get('dq-score')
  getDqScore(@Query('payPeriod') payPeriod: string) {
    if (!payPeriod) throw new BadRequestException('payPeriod query param required');
    return this.rulesService.getDqScore(payPeriod);
  }
}
