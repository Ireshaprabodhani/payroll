import { rule4IncompleteData } from '../../src/rules/rules/rule4-incomplete-data';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(), costCentres: new Set(),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule4IncompleteData', () => {
  it('should flag an Ordinary row with null Department', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: null, Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule4IncompleteData(input);
    expect(flags.some((f) => f.Flag_Type === 'INCOMPLETE_DEPARTMENT')).toBe(true);
  });

  it('should flag an Ordinary row with null Hours_Worked', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: null, Pay_Amount: null, Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule4IncompleteData(input);
    expect(flags.some((f) => f.Flag_Type === 'INCOMPLETE_HOURS_WORKED')).toBe(true);
  });

  it('should flag an Ordinary row with null Pay_Amount', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 3, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: null, Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule4IncompleteData(input);
    expect(flags.some((f) => f.Flag_Type === 'INCOMPLETE_PAY_AMOUNT')).toBe(true);
  });

  it('should not flag an Allowance row for missing Hours_Worked', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 4, Employee_ID: 'EMP-004', Pay_Period: '2024-01', Pay_Type: 'Allowance', Hours_Worked: null, Pay_Amount: new Decimal(500), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule4IncompleteData(input);
    expect(flags).toHaveLength(0);
  });
});
