import { Decimal } from '@prisma/client/runtime/library';

export interface ExtractRow {
  Record_ID: number;
  Employee_ID: string;
  Department: string | null;
  Cost_Centre: string | null;
  Pay_Period: string;
  Pay_Type: string;
  Hours_Worked: Decimal | null;
  Pay_Amount: Decimal | null;
  Source: string;
}

export interface AttendanceRow {
  Attendance_ID: number;
  Employee_ID: string;
  Punch_Date: Date;
  Punch_In: Date;
  Punch_Out: Date | null;
  Department: string;
  Cost_Centre: string;
  Import_Month: string;
}

export interface RuleInput {
  payPeriod: string;
  extract: ExtractRow[];
  attendance: AttendanceRow[];
  departments: Set<string>;
  costCentres: Set<string>;
  employeeDeptMap: Map<string, string>;
  rules: Map<string, Decimal>;
  importLog: { Import_Month: string; Imported_At: Date; Row_Count: number }[];
}
