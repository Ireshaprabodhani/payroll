import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';

interface AttendanceCsvRow {
  Employee_ID: string;
  Punch_Date: string;
  Punch_In: string;
  Punch_Out: string;
  Department: string;
  Cost_Centre: string;
}

/**
 * Convert a "HH:MM" or "HH:MM:SS" time string to a Date object.
 * Prisma maps @db.Time(0) columns to Date objects using 1970-01-01 as the sentinel date.
 * Returns null if the value is empty/missing.
 */
function parseTime(value: string): Date | null {
  if (!value || value.trim() === '') return null;
  const parts = value.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
  const d = new Date('1970-01-01T00:00:00.000Z');
  d.setUTCHours(hours, minutes, seconds, 0);
  return d;
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadAttendance(
    fileBuffer: Buffer,
    importMonth: string,
    sourceFileName: string,
  ): Promise<{ inserted: number; importMonth: string }> {
    let records: AttendanceCsvRow[];

    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as AttendanceCsvRow[];
    } catch (err) {
      throw new BadRequestException('Invalid CSV format: ' + (err as Error).message);
    }

    const required = ['Employee_ID', 'Punch_Date', 'Punch_In', 'Punch_Out', 'Department', 'Cost_Centre'];
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      for (const col of required) {
        if (!headers.includes(col)) {
          throw new BadRequestException(`CSV missing required column: ${col}`);
        }
      }
    }

    // Idempotent: delete existing rows for this month before inserting
    await this.prisma.attendance_History.deleteMany({
      where: { Import_Month: importMonth },
    });

    const rows = records.map((r) => ({
      Employee_ID: r.Employee_ID,
      Punch_Date: new Date(r.Punch_Date),
      Punch_In: parseTime(r.Punch_In) ?? new Date('1970-01-01T00:00:00.000Z'),
      Punch_Out: parseTime(r.Punch_Out),
      Department: r.Department,
      Cost_Centre: r.Cost_Centre,
      Source_File: sourceFileName,
      Import_Month: importMonth,
    }));

    await this.prisma.attendance_History.createMany({ data: rows });

    await this.prisma.import_Log.create({
      data: {
        Import_Month: importMonth,
        Source_File: sourceFileName,
        Row_Count: records.length,
      },
    });

    return { inserted: records.length, importMonth };
  }

  async getHistory(importMonth: string) {
    return this.prisma.attendance_History.findMany({
      where: { Import_Month: importMonth },
      orderBy: [{ Employee_ID: 'asc' }, { Punch_Date: 'asc' }],
    });
  }
}
