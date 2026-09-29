import { rule3MissingCostCentre } from '../../src/rules/rules/rule3-missing-cost-centre';
import { RuleInput } from '../../src/rules/rules.types';
import { Decimal } from '@prisma/client/runtime/library';

const baseInput = (): RuleInput => ({
  payPeriod: '2024-01', extract: [], attendance: [],
  departments: new Set(), costCentres: new Set(),
  employeeDeptMap: new Map(), rules: new Map(), importLog: [],
});

describe('rule3MissingCostCentre', () => {
  it('should flag a row with null Cost_Centre', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 1, Employee_ID: 'EMP-001', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: null, Source: 'Generated' }];
    const flags = rule3MissingCostCentre(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Flag_Type).toBe('MISSING_COST_CENTRE');
    expect(flags[0].Severity).toBe('ERROR');
  });

  it('should flag a row with empty-string Cost_Centre', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 2, Employee_ID: 'EMP-002', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: '', Source: 'Generated' }];
    const flags = rule3MissingCostCentre(input);
    expect(flags).toHaveLength(1);
    expect(flags[0].Record_ID).toBe(2);
  });

  it('should not flag a row with a valid Cost_Centre', () => {
    const input = baseInput();
    input.extract = [{ Record_ID: 3, Employee_ID: 'EMP-003', Pay_Period: '2024-01', Pay_Type: 'Ordinary', Hours_Worked: new Decimal(8), Pay_Amount: new Decimal(200), Department: 'HR', Cost_Centre: 'CC-100', Source: 'Generated' }];
    const flags = rule3MissingCostCentre(input);
    expect(flags).toHaveLength(0);
  });
});
