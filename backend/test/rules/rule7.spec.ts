import { rule7NegativeZeroPayment } from '../../src/rules/rules/rule7-negative-zero-payment';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(), costCentres: new Set(),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule7NegativeZeroPayment', () => {
  it('should flag an Ordinary row with negative Pay_Amount', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(-2), Pay_Amount: new Decimal(-50), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' }];
    const flags = rule7NegativeZeroPayment(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Flag_Type).toBe('NEGATIVE_OR_ZERO_PAYMENT');
    expect(flags[0].Severity).toBe('ERROR');
  });

  it('should flag an Ordinary row with zero Pay_Amount', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(0), Pay_Amount: new Decimal(0), Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' }];
    const flags = rule7NegativeZeroPayment(input);
    expect(flags).toHaveLength(1);
  });

  it('should not flag a null Pay_Amount (that is Rule 4)', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 3, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: null, Pay_Amount: null, Department: 'IT', Cost_Centre: 'CC-400', Source: 'Generated' }];
    const flags = rule7NegativeZeroPayment(input);
    expect(flags).toHaveLength(0);
  });
});
