import { rule8DepartmentMismatch } from '../../src/rules/rules/rule8-department-mismatch';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(), costCentres: new Set(),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule8DepartmentMismatch', () => {
  it('should flag when attendance Department differs from Employee_Department_Master', () => {
    const input = baseInput();
    input.employeeDeptMap.set('EMP-001', 'Finance');
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' }];
    const flags = rule8DepartmentMismatch(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Flag_Type).toBe('DEPARTMENT_MISMATCH');
    expect(flags[0].Severity).toBe('WARNING');
  });

  it('should not flag when attendance Department matches Employee_Department_Master', () => {
    const input = baseInput();
    input.employeeDeptMap.set('EMP-002', 'HR');
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule8DepartmentMismatch(input);
    expect(flags).toHaveLength(0);
  });

  it('should gracefully skip employees with no master record', () => {
    const input = baseInput();
    // No entry in employeeDeptMap for EMP-003
    input.extract = [{ Record_ID: 3, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'Sales', Cost_Centre: 'CC-300', Source: 'Generated' }];
    const flags = rule8DepartmentMismatch(input);
    expect(flags).toHaveLength(0);
  });
});
