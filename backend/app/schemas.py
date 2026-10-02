from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, time, datetime
from decimal import Decimal


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    role: str
    department: Optional[str] = None


# ── Users ─────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    Username: str
    Role: str
    Department: Optional[str] = None

    model_config = {"from_attributes": True}


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str
    department: Optional[str] = None


# ── Attendance ────────────────────────────────────────────────────────────────
class AttendanceRow(BaseModel):
    Attendance_ID: int
    Employee_ID: str
    Punch_Date: date
    Punch_In: Any
    Punch_Out: Optional[Any] = None
    Department: str
    Cost_Centre: str
    Source_File: str
    Import_Month: str

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    inserted: int
    importMonth: str


# ── Payroll Extract ───────────────────────────────────────────────────────────
class PayrollExtractRow(BaseModel):
    Record_ID: int
    Employee_ID: str
    Department: Optional[str] = None
    Cost_Centre: Optional[str] = None
    Pay_Period: str
    Pay_Type: str
    Hours_Worked: Optional[Decimal] = None
    Pay_Amount: Optional[Decimal] = None
    Source: str

    model_config = {"from_attributes": True}


class CalculateResponse(BaseModel):
    generated: int
    payPeriod: str


class SeedResponse(BaseModel):
    seeded: int
    skipped: bool


# ── Flagged Results ───────────────────────────────────────────────────────────
class FlaggedResultRow(BaseModel):
    Flag_ID: int
    Record_ID: int
    Flag_Type: str
    Severity: str
    Description: str

    model_config = {"from_attributes": True}


# ── Rules ─────────────────────────────────────────────────────────────────────
class ReportMarker(BaseModel):
    hasImportLog: bool
    importedAt: Optional[datetime] = None
    rowCount: Optional[int] = None


class RunRulesResponse(BaseModel):
    payPeriod: str
    totalExtractRows: int
    totalFlagsInserted: int
    dqScore: float
    reportMarker: ReportMarker
    flagSummary: dict


class DqScoreResponse(BaseModel):
    payPeriod: str
    totalRows: int
    flaggedRows: int
    dqScore: float


# ── Dashboard ─────────────────────────────────────────────────────────────────
class ImportLogOut(BaseModel):
    Import_ID: int
    Import_Month: str
    Source_File: str
    Row_Count: int
    Imported_At: datetime

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    payPeriod: str
    department: str
    totalExtractRows: int
    uniqueEmployees: int
    totalPayAmount: str
    totalFlags: int
    flaggedRows: int
    dqScore: float
    flagBreakdown: dict
    severityBreakdown: dict
    lastImport: Optional[ImportLogOut] = None
