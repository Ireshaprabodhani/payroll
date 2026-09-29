import { rule10ScheduledReportMarker } from '../../src/rules/rules/rule10-scheduled-report-marker';

describe('rule10ScheduledReportMarker', () => {
  it('should return hasImportLog=true when an Import_Log entry exists for the payPeriod', () => {
    const importedAt = new Date('2024-01-31T10:00:00.000Z');
    const importLog = [
      { Import_Month: '2024-01', Imported_At: importedAt, Row_Count: 55 },
    ];
    const result = rule10ScheduledReportMarker(importLog, '2024-01');
    expect(result.hasImportLog).toBe(true);
    expect(result.importedAt).toEqual(importedAt);
    expect(result.rowCount).toBe(55);
  });

  it('should return hasImportLog=false when no Import_Log entry exists for the payPeriod', () => {
    const importLog = [
      { Import_Month: '2023-12', Imported_At: new Date(), Row_Count: 50 },
    ];
    const result = rule10ScheduledReportMarker(importLog, '2024-01');
    expect(result.hasImportLog).toBe(false);
    expect(result.importedAt).toBeNull();
    expect(result.rowCount).toBeNull();
  });
});
