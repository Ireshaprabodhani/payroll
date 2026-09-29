import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('upload')
  @Roles('Admin', 'Payroll Manager')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('importMonth') importMonth: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!importMonth) throw new BadRequestException('importMonth query param required (format: YYYY-MM)');
    if (!/^\d{4}-\d{2}$/.test(importMonth)) {
      throw new BadRequestException('importMonth must be in YYYY-MM format');
    }
    return this.attendanceService.uploadAttendance(file.buffer, importMonth, file.originalname);
  }

  @Get('history')
  @Roles('Admin', 'Payroll Manager')
  getHistory(@Query('importMonth') importMonth: string) {
    if (!importMonth) throw new BadRequestException('importMonth query param required');
    return this.attendanceService.getHistory(importMonth);
  }
}
