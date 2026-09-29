/**
 * generate-sample-data.ts
 *
 * Reads the NYC Open Data Citywide Payroll CSV, de-identifies it,
 * maps columns to this project's schema, and generates synthetic
 * punch-level attendance for one calendar month.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-sample-data.ts --month 2024-01
 *
 * Input:  data/raw/nyc-payroll.csv
 * Output: data/processed/attendance_<YYYY_MM>.csv
 *         data/processed/pay_rates.csv
 *         data/processed/dept_master.csv
 *
 * NYC source columns (from the raw file):
 *   fiscal_year, payroll_number, agency_name, last_name, first_name, mid_init,
 *   agency_start_date, work_location_borough, title_description,
 *   leave_status_as_of_july_31, base_salary, pay_basis, regular_hours,
 *   regular_gross_paid, ot_hours, total_ot_paid, total_other_pay
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// ---------- Configuration ----------

const TARGET_EMPLOYEES = 55;
const TARGET_MONTH_ARG = process.argv.find((a) => a.startsWith('--month='))?.split('=')[1]
  ?? process.argv[process.argv.indexOf('--month') + 1]
  ?? '2024-01';

const [yearStr, monthStr] = TARGET_MONTH_ARG.split('-');
const YEAR = parseInt(yearStr, 10);
const MONTH = parseInt(monthStr, 10); // 1-based

const RAW_CSV = path.resolve('data/raw/nyc-payroll.csv');
const OUT_DIR = path.resolve('data/processed');

// ---------- Reference Maps ----------

/** Map the most common NYC agency names → Valid_Departments entries */
const AGENCY_TO_DEPT: Record<string, string> = {
  'DEPT OF ED PEDAGOGICAL': 'Manufacturing',
  'POLICE DEPARTMENT': 'Executive',
  'DEPT OF EDUCATION ADMIN': 'HR',
  'FIRE DEPARTMENT': 'Warehouse',
  'DEPT OF FINANCE': 'Finance',
  'HUMAN RESOURCES ADMIN': 'HR',
  'DEPT OF SANITATION': 'Warehouse',
  'DEPARTMENT OF CORRECTION': 'Executive',
  'DEPT OF TRANSPORTATION': 'Manufacturing',
  'DEPT OF CITYWIDE ADMIN SVCS': 'Payroll',
  'NYC HEALTH + HOSPITALS': 'HR',
  'OFFICE OF MANAGEMENT & BUDGET': 'Finance',
  'LAW DEPARTMENT': 'Executive',
  'DEPT OF PARKS & RECREATION': 'Sales',
  'DEPT OF INFO TECH & TELECOMM': 'IT',
  'DEPT OF BUILDINGS': 'Manufacturing',
  'DEPT OF SOCIAL SERVICES': 'HR',
  'DEPT OF PROBATION': 'Executive',
  'BOARD OF ELECTIONS': 'Payroll',
  'TEACHERS RETIREMENT SYSTEM': 'Finance',
};

const BOROUGH_TO_CC: Record<string, string> = {
  MANHATTAN: 'CC-500',
  BROOKLYN: 'CC-200',
  QUEENS: 'CC-300',
  BRONX: 'CC-210',
  'STATEN ISLAND': 'CC-400',
  RICHMOND: 'CC-400',
  KINGS: 'CC-200',
  NEW YORK: 'CC-100',
};

const VALID_DEPTS = ['HR', 'Finance', 'Payroll', 'Manufacturing', 'Warehouse', 'Sales', 'IT', 'Executive'];
const VALID_CCS = ['CC-100', 'CC-110', 'CC-200', 'CC-210', 'CC-300', 'CC-400', 'CC-500'];

// ---------- Seeded RNG (for reproducibility) ----------

class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = ((this.seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    return this.seed / 0xffffffff;
  }

  intBetween(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const rng = new SeededRNG(42_424_242);

// ---------- Helpers ----------

function getWeekdays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(h: number, m: number): string {
  return `${pad2(h)}:${pad2(m)}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function mapAgency(agency: string): string {
  const key = agency?.toUpperCase().trim();
  for (const [pattern, dept] of Object.entries(AGENCY_TO_DEPT)) {
    if (key?.includes(pattern.split(' ')[0])) return dept;
  }
  return rng.pick(VALID_DEPTS);
}

function mapBorough(borough: string): string {
  const key = borough?.toUpperCase().trim();
  return BOROUGH_TO_CC[key] ?? rng.pick(VALID_CCS);
}

// ---------- Main ----------

function main() {
  if (!fs.existsSync(RAW_CSV)) {
    console.error(`\nRaw CSV not found at: ${RAW_CSV}`);
    console.error('Please place the NYC Open Data Citywide Payroll CSV at that path and re-run.\n');
    process.exit(1);
  }

  const rawRows = parse(fs.readFileSync(RAW_CSV), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  console.log(`Read ${rawRows.length} rows from source CSV.`);

  // De-identify: remove PII columns, generate Employee_ID
  // Keep only rows with usable regular_hours and regular_gross_paid
  const usable = rawRows.filter((r) => {
    const hours = parseFloat(r.regular_hours);
    const gross = parseFloat(r.regular_gross_paid?.replace(/[$,]/g, '') ?? '0');
    return hours > 0 && gross > 0;
  });

  const selected = usable.slice(0, TARGET_EMPLOYEES);
  console.log(`Selected ${selected.length} employees for de-identification.`);

  const weekdays = getWeekdays(YEAR, MONTH);
  console.log(`Generating punches for ${weekdays.length} weekdays in ${TARGET_MONTH_ARG}.`);

  // --- De-identified master data ---
  const payRateRows: { Employee_ID: string; Hourly_Rate: string }[] = [];
  const deptMasterRows: { Employee_ID: string; Official_Department: string }[] = [];

  // Attendance output
  type PunchRow = {
    Employee_ID: string;
    Punch_Date: string;
    Punch_In: string;
    Punch_Out: string;
    Department: string;
    Cost_Centre: string;
  };

  const attendanceRows: PunchRow[] = [];

  selected.forEach((row, idx) => {
    const empId = `EMP-${String(idx + 1).padStart(3, '0')}`;

    // --- Map master data ---
    const dept = mapAgency(row.agency_name ?? '');
    const cc = mapBorough(row.work_location_borough ?? '');

    const hours = parseFloat(row.regular_hours);
    const gross = parseFloat((row.regular_gross_paid ?? '0').replace(/[$,]/g, ''));
    const hourlyRate = (gross / hours).toFixed(2);

    payRateRows.push({ Employee_ID: empId, Hourly_Rate: hourlyRate });
    // Only add ~45 of the 55 employees to the dept master (the other 10 have no master record)
    if (idx < 45) {
      deptMasterRows.push({ Employee_ID: empId, Official_Department: dept });
    }

    // --- Generate attendance punches ---
    const isDirty7Monthly = idx === 48; // Rule 2 (monthly) dirty: >260h
    const isDirty2Daily = idx === 49;   // Rule 2 (daily) dirty: >12h/day
    const isDirty3 = idx === 50;        // Rule 3: blank Cost_Centre
    const isDirty4 = idx === 51;        // Rule 4: missing Punch_Out every day → null Hours_Worked
    const isDirty5CC = idx === 52;      // Rule 5: invalid Cost_Centre
    const isDirty7Pay = idx === 53;     // Rule 7: negative pay (negative rate hack via punch reversal)
    const isDirty8 = idx === 54;        // Rule 8: dept mismatch (only in deptMaster for idx<45, so idx=44)

    for (const day of weekdays) {
      let punchInH = 8;
      let punchInM = rng.intBetween(0, 15);
      let punchOutH = 16;
      let punchOutM = rng.intBetween(25, 45);
      let punchOutStr = formatTime(punchOutH, punchOutM);

      if (isDirty7Monthly) {
        // Force 13h shifts so monthly total > 260h over 22 days (22×13=286h)
        punchInH = 6; punchInM = 0; punchOutH = 19; punchOutM = 0;
        punchOutStr = formatTime(punchOutH, punchOutM);
      }

      if (isDirty2Daily) {
        // 14-hour shift: 07:00 → 21:00 (14h > Max_Daily_Hours of 12)
        punchInH = 7; punchInM = 0; punchOutH = 21; punchOutM = 0;
        punchOutStr = formatTime(punchOutH, punchOutM);
      }

      if (isDirty4) {
        // No Punch_Out for any day → Hours_Worked stays NULL
        punchOutStr = '';
      }

      if (isDirty7Pay) {
        // Punch_Out before Punch_In → negative hours → negative Pay_Amount
        punchOutStr = formatTime(punchInH - 2, punchInM);
      }

      const costCentreOut = isDirty3
        ? ''
        : isDirty5CC
        ? 'CC-999'
        : cc;

      // For dirty Rule 8: use a department that differs from what's in deptMaster (if applicable)
      const deptOut = isDirty8
        ? (dept === 'IT' ? 'Finance' : 'IT') // deliberately wrong
        : dept;

      attendanceRows.push({
        Employee_ID: empId,
        Punch_Date: formatDate(day),
        Punch_In: formatTime(punchInH, punchInM),
        Punch_Out: punchOutStr,
        Department: deptOut,
        Cost_Centre: costCentreOut,
      });
    }
  });

  // --- Write output files ---
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const attendancePath = path.join(OUT_DIR, `attendance_${yearStr}_${monthStr}.csv`);
  const payRatePath = path.join(OUT_DIR, 'pay_rates.csv');
  const deptMasterPath = path.join(OUT_DIR, 'dept_master.csv');

  fs.writeFileSync(
    attendancePath,
    stringify(attendanceRows, { header: true }),
    'utf-8',
  );

  fs.writeFileSync(
    payRatePath,
    stringify(payRateRows, { header: true }),
    'utf-8',
  );

  fs.writeFileSync(
    deptMasterPath,
    stringify(deptMasterRows, { header: true }),
    'utf-8',
  );

  console.log(`\nOutput files written:`);
  console.log(`  Attendance : ${attendancePath} (${attendanceRows.length} punch rows)`);
  console.log(`  Pay rates  : ${payRatePath} (${payRateRows.length} employees)`);
  console.log(`  Dept master: ${deptMasterPath} (${deptMasterRows.length} employees)`);
  console.log(`\nDirty employees injected:`);
  console.log(`  EMP-049 — Rule 2 monthly (>260h via 13h daily shifts)`);
  console.log(`  EMP-050 — Rule 2 daily   (14h/day punches)`);
  console.log(`  EMP-051 — Rule 3         (blank Cost_Centre)`);
  console.log(`  EMP-052 — Rule 4         (no Punch_Out → null Hours_Worked/Pay_Amount)`);
  console.log(`  EMP-053 — Rule 5         (Cost_Centre = CC-999, invalid)`);
  console.log(`  EMP-054 — Rule 7         (Punch_Out before Punch_In → negative Pay_Amount)`);
  console.log(`  EMP-055 — Rule 8         (attendance Dept differs from dept_master.csv)`);
  console.log(`\nNext steps:`);
  console.log(`  1. Import dept_master.csv and pay_rates.csv into Employee_Department_Master`);
  console.log(`     and Employee_Pay_Rate tables (via Prisma Studio or a seed script).`);
  console.log(`  2. Upload attendance CSV via POST /attendance/upload?importMonth=${TARGET_MONTH_ARG}`);
  console.log(`  3. POST /payroll/process?payPeriod=${TARGET_MONTH_ARG}`);
  console.log(`  4. GET  /rules/flags?payPeriod=${TARGET_MONTH_ARG} — verify 8 flag types fired\n`);
}

main();
