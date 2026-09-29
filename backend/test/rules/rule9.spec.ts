import { rule9DqScore } from '../../src/rules/rules/rule9-dq-score';
import { Prisma } from '@prisma/client';

describe('rule9DqScore', () => {
  it('should return 100 when there are no flags', () => {
    const extract = [{ Record_ID: 1 }, { Record_ID: 2 }, { Record_ID: 3 }];
    const flags: Prisma.Flagged_ResultsCreateManyInput[] = [];
    expect(rule9DqScore(extract, flags)).toBe(100);
  });

  it('should return the correct percentage when some rows are flagged', () => {
    const extract = [{ Record_ID: 1 }, { Record_ID: 2 }, { Record_ID: 3 }, { Record_ID: 4 }];
    const flags: Prisma.Flagged_ResultsCreateManyInput[] = [
      { Record_ID: 1, Flag_Type: 'DUPLICATE_PAYMENT', Severity: 'ERROR', Description: 'test' },
    ];
    // 3 clean out of 4 = 75%
    expect(rule9DqScore(extract, flags)).toBe(75);
  });

  it('should return 100 for an empty extract (no division by zero)', () => {
    expect(rule9DqScore([], [])).toBe(100);
  });
});
