# Payroll Data Quality System

A payroll data quality management system built with NestJS (backend), Next.js (frontend), Prisma ORM, and MySQL. It validates payroll extract records against 10 configurable business rules and displays results on a real-time dashboard.

---

## Prerequisites

- Node.js 18+
- MySQL 8 (via XAMPP, Docker, or local install)
- npm

---

## Database Setup

### Option A — XAMPP
1. Start MySQL in XAMPP Control Panel (configure port to `3308` if port `3306` is in use)
2. Open MySQL CLI: `C:\xampp\mysql\bin\mysql.exe -u root -P 3308`
3. Run:
```sql
CREATE DATABASE payroll_db;
CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'payroll_pass';
GRANT ALL PRIVILEGES ON payroll_db.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
```

### Option B — Docker
```bash
docker-compose up -d
```
MySQL will be available on port `3307`.

---

## Environment Variables

All `.env` files are excluded from version control. Create the following before running:

**`backend/.env`**
```
DATABASE_URL="mysql://payroll_user:payroll_pass@localhost:3308/payroll_db"
JWT_SECRET="payroll-jwt-secret-change-in-production"
JWT_EXPIRY="8h"
PORT=3001
```
> Change port to `3307` if using Docker, `3306` if using default MySQL port.

---

## Backend Setup

```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
```

---

## Load the NYC Payroll Dataset

Place the [NYC Open Data Citywide Payroll CSV](https://data.cityofnewyork.us/City-Government/Citywide-Payroll-Data-Fiscal-Year-/k397-673e) at:
```
data/raw/nyc-payroll.csv
```

Then run:
```bash
cd backend
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/load-nyc.ts --payPeriod 2020-01
```

This populates `Employee_Pay_Rate`, `Employee_Department_Master`, and `Payroll_Extract` directly from the public dataset, with 7 injected data quality violations for testing.

---

## Start the Application

**Backend** (port 3001):
```bash
cd backend
npm run start:dev
```

**Frontend** (port 3000 or 3002 if 3000 is occupied):
```bash
cd frontend
npm install
npm run dev
# or: npm run dev -- -p 3002
```

---

## Run the Rules Engine

After loading data, trigger validation via the browser console on the frontend:
```javascript
fetch('http://localhost:3001/rules/run?payPeriod=2020-01', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('payroll_token') }
}).then(r => r.json()).then(console.log)
```

Then set pay period to `2020-01` on the dashboard and click **Load Report**.

---

## Default Users

| Username | Password | Role | Scope |
|---|---|---|---|
| `admin` | `admin123` | Admin | Full organisation |
| `payroll_manager` | `payroll123` | Payroll Manager | Full organisation |
| `end_user` | `enduser123` | End User | Finance dept only |

---

## Validation Rules

| Rule | Description |
|---|---|
| Rule 1 | Duplicate payment detection |
| Rule 2 | Out-of-range monthly/daily hours |
| Rule 3 | Missing Cost Centre |
| Rule 4 | Incomplete data (null Hours/Pay) |
| Rule 5 | Invalid Department or Cost Centre |
| Rule 6 | Allowance row with no Pay Amount |
| Rule 7 | Negative or zero payment |
| Rule 8 | Department mismatch vs master |
| Rule 9 | Data Quality score (0–100%) |
| Rule 10 | Monthly import completeness check |
