/**
 * load-nyc.ts
 *
 * Reads the NYC Open Data Citywide Payroll CSV from data/raw/nyc-payroll.csv,
 * de-identifies employees, and seeds the database directly.
 * Bypasses the attendance upload pipeline — populates Payroll_Extract directly.
 *
 * Usage (run from the backend/ directory):
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/load-nyc.ts --payPeriod 2020-01
 *
 * Input:  ../data/raw/nyc-payroll.csv
 * Output: Populates Employee_Pay_Rate, Employee_Department_Master,
 *         Payroll_Extract (Generated + Seeded-Dirty), Import_Log
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';

// Load DATABASE_URL — try root .env first, then backend.env
const rootEnv = path.resolve(__dirname, '../../.env');
const backendEnv = path.resolve(__dirname, '../backend.env');
dotenv.config({ path: fs.existsSync(rootEnv) ? rootEnv : backendEnv });

const prisma = new PrismaClient();

// ---------- Configuration ----------

const TARGET_EMPLOYEES = 55;

const payPeriodIdx = process.argv.indexOf('--payPeriod');
const PAY_PERIOD =
  process.argv.find((a) => a.startsWith('--payPeriod='))?.split('=')[1] ??
  (payPeriodIdx !== -1 ? process.argv[payPeriodIdx + 1] : '2020-01');

// Resolve from backend/prisma/ up to project root, then into data/raw/
const RAW_CSV = path.resolve(__dirname, '../../data/raw/nyc-payroll.csv');

// ---------- Department & Cost-Centre Maps (same as generate-sample-data.ts) ----------

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
  'NEW YORK': 'CC-100',
};

const VALID_DEPTS = ['HR', 'Finance', 'Payroll', 'Manufacturing', 'Warehouse', 'Sales', 'IT', 'Executive'];
const VALID_CCS = ['CC-100', 'CC-110', 'CC-200', 'CC-210', 'CC-300', 'CC-400', 'CC-500'];

function mapAgency(agency: string): string {
  const key = (agency ?? '').toUpperCase().trim();
  for (const [pattern, dept] of Object.entries(AGENCY_TO_DEPT)) {
    if (key.includes(pattern.split(' ')[0])) return dept;
  }
  return VALID_DEPTS[key.charCodeAt(0) % VALID_DEPTS.length] ?? 'HR';
}

function mapBorough(borough: string): string {
  const key = (borough ?? '').toUpperCase().trim();
  return BOROUGH_TO_CC[key] ?? VALID_CCS[key.charCodeAt(0) % VALID_CCS.length] ?? 'CC-100';
}

// ---------- Main ----------

async function main() {
  if (!fs.existsSync(RAW_CSV)) {
    console.error(`\nRaw CSV not found at: ${RAW_CSV}`);
    console.error('Place nyc-payroll.csv in the data/raw/ folder at the project root.\n');
    process.exit(1);
  }

  const rawRows = parse(fs.readFileSync(RAW_CSV), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  console.log(`Read ${rawRows.length} rows from source CSV.`);

  // Keep rows with positive annual hours and gross pay
  const usable = rawRows.filter((r) => {
    const hours = parseFloat(r.regular_hours ?? '0');
    const gross = parseFloat((r.regular_gross_paid ?? '0').replace(/[$,]/g, ''));
    return hours > 0 && gross > 0;
  });

  const selected = usable.slice(0, TARGET_EMPLOYEES);
  console.log(`Selected ${selected.length} employees (${usable.length} usable rows in CSV).`);

  if (selected.length < 55) {
    console.warn(`Warning: fewer than 55 usable employees found. Some dirty records may be skipped.`);
  }

  // ---------- Build employee records ----------

  type EmpData = {
    empId: string;
    dept: string;
    cc: string;
    hourlyRate: number;
    monthlyHours: number;
    monthlyPay: number;
  };

  const employees: EmpData[] = selected.map((row, idx) => {
    const empId = `EMP-${String(idx + 1).padStart(3, '0')}`;
    const dept = mapAgency(row.agency_name ?? '');
    const cc = mapBorough(row.work_location_borough ?? '');
    const annualHours = parseFloat(row.regular_hours);
    const annualGross = parseFloat((row.regular_gross_paid ?? '0').replace(/[$,]/g, ''));
    const hourlyRate = annualGross / annualHours;
    // Convert annual figures to monthly equivalents
    const monthlyHours = annualHours / 12;
    const monthlyPay = hourlyRate * monthlyHours;
    return { empId, dept, cc, hourlyRate, monthlyHours, monthlyPay };
  });

  // ---------- Clear existing data for this pay period ----------

  console.log(`\nClearing existing data for payPeriod=${PAY_PERIOD}...`);

  const existing = await prisma.payroll_Extract.findMany({
    where: { Pay_Period: PAY_PERIOD },
    select: { Record_ID: true },
  });

  if (existing.length > 0) {
    const ids = existing.map((r) => r.Record_ID);
    await prisma.flagged_Results.deleteMany({ where: { Record_ID: { in: ids } } });
    await prisma.payroll_Extract.deleteMany({ where: { Pay_Period: PAY_PERIOD } });
  }

  await prisma.import_Log.deleteMany({ where: { Import_Month: PAY_PERIOD } });
  // Full replace of master tables (safe — seed.ts does not populate these)
  await prisma.employee_Department_Master.deleteMany({});
  await prisma.employee_Pay_Rate.deleteMany({});
  console.log('Cleared.');

  // ---------- Seed master tables ----------

  console.log('\nInserting Employee_Pay_Rate...');
  for (const emp of employees) {
    await prisma.employee_Pay_Rate.create({
      data: {
        Employee_ID: emp.empId,
        Hourly_Rate: emp.hourlyRate.toFixed(4),
      },
    });
  }

  // Only first 45 get a department master record (10 intentionally omitted for Rule 4/8 testing)
  console.log('Inserting Employee_Department_Master (first 45 employees)...');
  for (const emp of employees.slice(0, 45)) {
    await prisma.employee_Department_Master.create({
      data: {
        Employee_ID: emp.empId,
        Official_Department: emp.dept,
      },
    });
  }

  // ---------- Insert clean Generated records ----------

  console.log('\nInserting clean Payroll_Extract records (Source: Generated)...');
  for (const emp of employees) {
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp.empId,
        Department: emp.dept,
        Cost_Centre: emp.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: emp.monthlyHours.toFixed(4),
        Pay_Amount: emp.monthlyPay.toFixed(2),
        Source: 'Generated',
      },
    });
  }
  console.log(`  ${employees.length} clean Ordinary rows inserted.`);

  // ---------- Inject dirty records (Source: Seeded-Dirty) ----------

  console.log('\nInjecting dirty records...');

  // Rule 1 — Duplicate payment: exact copy of EMP-001
  const emp1 = employees[0];
  await prisma.payroll_Extract.create({
    data: {
      Employee_ID: emp1.empId,
      Department: emp1.dept,
      Cost_Centre: emp1.cc,
      Pay_Period: PAY_PERIOD,
      Pay_Type: 'Ordinary',
      Hours_Worked: emp1.monthlyHours.toFixed(4),
      Pay_Amount: emp1.monthlyPay.toFixed(2),
      Source: 'Seeded-Dirty',
    },
  });
  console.log(`  ${emp1.empId} — Rule 1: duplicate payment`);

  // Rule 2 — Monthly hours > 260 (Max_Monthly_Hours)
  if (employees.length > 48) {
    const emp49 = employees[48];
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp49.empId,
        Department: emp49.dept,
        Cost_Centre: emp49.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: '270.0000',
        Pay_Amount: (emp49.hourlyRate * 270).toFixed(2),
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp49.empId} — Rule 2: monthly hours > 260`);
  }

  // Rule 3 — Missing Cost_Centre (null)
  if (employees.length > 49) {
    const emp50 = employees[49];
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp50.empId,
        Department: emp50.dept,
        Cost_Centre: null,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: emp50.monthlyHours.toFixed(4),
        Pay_Amount: emp50.monthlyPay.toFixed(2),
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp50.empId} — Rule 3: null Cost_Centre`);
  }

  // Rule 4 — Incomplete data (null Hours_Worked and Pay_Amount)
  if (employees.length > 50) {
    const emp51 = employees[50];
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp51.empId,
        Department: emp51.dept,
        Cost_Centre: emp51.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: null,
        Pay_Amount: null,
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp51.empId} — Rule 4: null Hours_Worked / Pay_Amount`);
  }

  // Rule 5 — Invalid Cost_Centre
  if (employees.length > 51) {
    const emp52 = employees[51];
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp52.empId,
        Department: emp52.dept,
        Cost_Centre: 'CC-999',
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: emp52.monthlyHours.toFixed(4),
        Pay_Amount: emp52.monthlyPay.toFixed(2),
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp52.empId} — Rule 5: invalid Cost_Centre CC-999`);
  }

  // Rule 7 — Negative Pay_Amount
  if (employees.length > 52) {
    const emp53 = employees[52];
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp53.empId,
        Department: emp53.dept,
        Cost_Centre: emp53.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: emp53.monthlyHours.toFixed(4),
        Pay_Amount: '-50.00',
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp53.empId} — Rule 7: negative Pay_Amount`);
  }

  // Rule 8 — Department mismatch: use EMP-044 (idx 43, IS in master)
  // Insert a Seeded-Dirty record with the wrong department
  if (employees.length > 43) {
    const emp44 = employees[43];
    const wrongDept = emp44.dept === 'IT' ? 'Finance' : 'IT';
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp44.empId,
        Department: wrongDept, // Deliberately differs from Employee_Department_Master
        Cost_Centre: emp44.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Ordinary',
        Hours_Worked: emp44.monthlyHours.toFixed(4),
        Pay_Amount: emp44.monthlyPay.toFixed(2),
        Source: 'Seeded-Dirty',
      },
    });
    console.log(`  ${emp44.empId} — Rule 8: dept mismatch (Payroll_Extract=${wrongDept}, master=${emp44.dept})`);
  }

  // Rule 6 — Allowance rows with null Pay_Amount
  for (const emp of employees.slice(1, 3)) { // EMP-002, EMP-003
    await prisma.payroll_Extract.create({
      data: {
        Employee_ID: emp.empId,
        Department: emp.dept,
        Cost_Centre: emp.cc,
        Pay_Period: PAY_PERIOD,
        Pay_Type: 'Allowance',
        Hours_Worked: null,
        Pay_Amount: null,
        Source: 'Seeded-Dirty',
      },
    });
  }
  console.log(`  EMP-002, EMP-003 — Rule 6: Allowance with null Pay_Amount`);

  // ---------- Import Log ----------

  await prisma.import_Log.create({
    data: {
      Import_Month: PAY_PERIOD,
      Source_File: 'nyc-payroll.csv',
      Row_Count: selected.length,
    },
  });

  // ---------- Summary ----------

  const totalExtract = await prisma.payroll_Extract.count({ where: { Pay_Period: PAY_PERIOD } });

  console.log('\n--- Load complete ---');
  console.log(`  Pay period      : ${PAY_PERIOD}`);
  console.log(`  Employees       : ${selected.length}`);
  console.log(`  Payroll records : ${totalExtract} (${selected.length} clean + dirty)`);
  console.log(`  Master tables   : ${selected.length} pay rates, 45 dept records`);
  console.log('\nNext steps:');
  console.log(`  1. POST /rules/run?payPeriod=${PAY_PERIOD}`);
  console.log(`  2. GET  /rules/flags?payPeriod=${PAY_PERIOD}    (verify 8 rule types fired)`);
  console.log(`  3. GET  /dashboard/summary                       (view KPIs & DQ score)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
