from sqlalchemy import Column, Integer, String, Numeric, Date, Time, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Attendance_History(Base):
    __tablename__ = "Attendance_History"

    Attendance_ID = Column(Integer, primary_key=True, autoincrement=True)
    Employee_ID = Column(String(255), nullable=False)
    Punch_Date = Column(Date, nullable=False)
    Punch_In = Column(Time, nullable=False)
    Punch_Out = Column(Time, nullable=True)
    Department = Column(String(255), nullable=False)
    Cost_Centre = Column(String(255), nullable=False)
    Source_File = Column(String(255), nullable=False)
    Import_Month = Column(String(7), nullable=False)


class Employee_Department_Master(Base):
    __tablename__ = "Employee_Department_Master"

    Employee_ID = Column(String(255), primary_key=True)
    Official_Department = Column(String(255), nullable=False)


class Employee_Pay_Rate(Base):
    __tablename__ = "Employee_Pay_Rate"

    Employee_ID = Column(String(255), primary_key=True)
    Hourly_Rate = Column(Numeric(10, 4), nullable=False)


class Company_Master_Rules(Base):
    __tablename__ = "Company_Master_Rules"

    Rule_Name = Column(String(255), primary_key=True)
    Value = Column(Numeric(10, 4), nullable=False)
    Description = Column(String(500), nullable=False)


class Valid_Cost_Centres(Base):
    __tablename__ = "Valid_Cost_Centres"

    Cost_Centre_Code = Column(String(255), primary_key=True)
    Description = Column(String(500), nullable=False)


class Valid_Departments(Base):
    __tablename__ = "Valid_Departments"

    Department = Column(String(255), primary_key=True)


class Payroll_Extract(Base):
    __tablename__ = "Payroll_Extract"

    Record_ID = Column(Integer, primary_key=True, autoincrement=True)
    Employee_ID = Column(String(255), nullable=False)
    Department = Column(String(255), nullable=True)
    Cost_Centre = Column(String(255), nullable=True)
    Pay_Period = Column(String(7), nullable=False)
    Pay_Type = Column(String(100), nullable=False)
    Hours_Worked = Column(Numeric(10, 4), nullable=True)
    Pay_Amount = Column(Numeric(10, 2), nullable=True)
    Source = Column(String(100), nullable=False, default="Generated")

    flagged_results = relationship("Flagged_Results", back_populates="payroll_record",
                                   cascade="all, delete-orphan")


class Flagged_Results(Base):
    __tablename__ = "Flagged_Results"

    Flag_ID = Column(Integer, primary_key=True, autoincrement=True)
    Record_ID = Column(Integer, ForeignKey("Payroll_Extract.Record_ID"), nullable=False)
    Flag_Type = Column(String(100), nullable=False)
    Severity = Column(String(50), nullable=False)
    Description = Column(Text, nullable=False)

    payroll_record = relationship("Payroll_Extract", back_populates="flagged_results")


class Import_Log(Base):
    __tablename__ = "Import_Log"

    Import_ID = Column(Integer, primary_key=True, autoincrement=True)
    Import_Month = Column(String(7), nullable=False)
    Source_File = Column(String(255), nullable=False)
    Row_Count = Column(Integer, nullable=False)
    Imported_At = Column(DateTime, nullable=False, server_default=func.now())


class Users(Base):
    __tablename__ = "Users"

    Username = Column(String(255), primary_key=True)
    Password = Column(String(255), nullable=False)
    Role = Column(String(100), nullable=False)
    Department = Column(String(255), nullable=True)
