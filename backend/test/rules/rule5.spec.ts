import { rule5InvalidData } from '../../src/rules/rules/rule5-invalid-data';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(['HR', 'IT', 'Finance']),
  costCentres: new Set(['CC-100', 'CC-400']),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule5InvalidData', () => {
  it('should flag a Cost_Centre not in Valid_Cost_Centres', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-999', Source: 'Generated' }];
    const flags = rule5InvalidData(input);
    expect(flags.some((f) => f.Flag_Type === 'INVALID_COST_CENTRE')).toBe(true);
  });

  it('should flag a Department not in Valid_Departments', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'UnknownDept', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule5InvalidData(input);
    expect(flags.some((f) => f.Flag_Type === 'INVALID_DEPARTMENT')).toBe(true);
  });

  it('should not flag a row with valid Cost_Centre and Department', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 3, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule5InvalidData(input);
    expect(flags).toHaveLength(0);
  });
});
