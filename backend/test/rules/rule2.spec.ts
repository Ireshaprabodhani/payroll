import { rule2OutOfRangeHours } from '../../src/rules/rules/rule2-out-of-range-hours';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const SENTINEL = new Date('1970-01-01T00:00:00.000Z');

function makeTime(hh: number, mm: number): Date {
  const d = new Date('1970-01-01T00:00:00.000Z');
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

const baseRules = new Map([
  ['Max_Monthly_Hours', new Decimal(260)],
  ['Min_Monthly_Hours', new Decimal(0)],
  ['Max_Daily_Hours', new Decimal(12)],
]);

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01',
  extract: [],
  attendance: [],
  departments: new Set(),
  costCentres: new Set(),
  employeeDeptMap: new Map(),
  rules: baseRules,
  importLog: [],
});

describe('rule2OutOfRangeHours', () => {
  it('should flag when monthly hours exceed Max_Monthly_Hours', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(300), Pay_Amount: new Decimal(7500), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' },
    ];
    const flags = rule2OutOfRangeHours(input);
    const monthlyFlags = flags.filter((f) => f.Flag_Type === 'OUT_OF_RANGE_MONTHLY_HOURS_HIGH');
    expect(monthlyFlags.length).toBeGreaterThan(0);
  });

  it('should not flag when monthly hours are within valid range', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(160), Pay_Amount: new Decimal(4000), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' },
    ];
    const flags = rule2OutOfRangeHours(input);
    const monthlyFlags = flags.filter((f) => f.Flag_Type.includes('MONTHLY'));
    expect(monthlyFlags).toHaveLength(0);
  });

  it('should flag when a single day exceeds Max_Daily_Hours', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(160), Pay_Amount: new Decimal(4000), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' },
    ];
    // 14-hour day: 08:00 → 22:00
    input.attendance = [
      { Attendance_ID: 1, Employee_ID: 'EMP-002', Punch_Date: new Date('2024-01-02'), Punch_In: makeTime(8, 0), Punch_Out: makeTime(22, 0), Department: 'IT', Cost_Centre: 'CC-400', Import_Month: '2024-01' },
    ];
    const flags = rule2OutOfRangeHours(input);
    const dailyFlags = flags.filter((f) => f.Flag_Type === 'OUT_OF_RANGE_DAILY_HOURS');
    expect(dailyFlags.length).toBeGreaterThan(0);
  });

  it('should not flag when daily hours are within Max_Daily_Hours', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(80), Pay_Amount: new Decimal(2000), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' },
    ];
    // 8-hour day: 08:00 → 16:00
    input.attendance = [
      { Attendance_ID: 1, Employee_ID: 'EMP-003', Punch_Date: new Date('2024-01-02'), Punch_In: makeTime(8, 0), Punch_Out: makeTime(16, 0), Department: 'IT', Cost_Centre: 'CC-400', Import_Month: '2024-01' },
    ];
    const flags = rule2OutOfRangeHours(input);
    const dailyFlags = flags.filter((f) => f.Flag_Type === 'OUT_OF_RANGE_DAILY_HOURS');
    expect(dailyFlags).toHaveLength(0);
  });
});
