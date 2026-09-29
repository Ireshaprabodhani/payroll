import { rule1DuplicatePayment } from '../../src/rules/rules/rule1-duplicate-payment';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01',
  extract: [],
  attendance: [],
  departments: new Set(),
  costCentres: new Set(),
  employeeDeptMap: new Map(),
  rules: new Map(),
  importLog: [],
});

describe('rule1DuplicatePayment', () => {
  it('should not flag when all rows are unique', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' },
      { Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(160), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' },
    ];
    const flags = rule1DuplicatePayment(input);
    expect(flags).toHaveLength(0);
  });

  it('should flag the second occurrence of a duplicate row', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' },
      { Record_ID: 2, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Seeded-Dirty' },
    ];
    const flags = rule1DuplicatePayment(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Record_ID).toBe(2);
    expect(flags[0].Flag_Type).toBe('DUPLICATE_PAYMENT');
    expect(flags[0].Severity).toBe('ERROR');
  });

  it('should flag multiple duplicates in the same dataset', () => {
    const input = baseInput();
    input.extract = [
      { Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' },
      { Record_ID: 2, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Seeded-Dirty' },
      { Record_ID: 3, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(7.5), Pay_Amount: new Decimal(150), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' },
      { Record_ID: 4, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(7.5), Pay_Amount: new Decimal(150), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Seeded-Dirty' },
    ];
    const flags = rule1DuplicatePayment(input);
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.Record_ID)).toEqual([2, 4]);
  });
});
