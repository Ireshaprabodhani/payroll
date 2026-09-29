import { rule6AllowanceMissingAmount } from '../../src/rules/rules/rule6-allowance-missing-amount';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(), costCentres: new Set(),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule6AllowanceMissingAmount', () => {
  it('should flag an Allowance row with null Pay_Amount', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Allowance', Hours_Worked: null, Pay_Amount: null, Department: 'HR', Cost_Centre: 'CC-100', Source: 'Seeded-Dirty' }];
    const flags = rule6AllowanceMissingAmount(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Flag_Type).toBe('ALLOWANCE_MISSING_AMOUNT');
    expect(flags[0].Severity).toBe('WARNING');
  });

  it('should not flag an Allowance row with a valid Pay_Amount', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Allowance', Hours_Worked: null, Pay_Amount: new Decimal(500), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule6AllowanceMissingAmount(input);
    expect(flags).toHaveLength(0);
  });
});
