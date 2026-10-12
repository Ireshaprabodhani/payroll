'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getRole } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

const ALLOWED_ROLES = ['Admin', 'Payroll Manager', 'Finance', 'HR', 'End User'];

interface FlaggedRecord {
  Flag_ID: number;
  Record_ID: number;
  Flag_Type: string;
  Severity: string;
  Description: string;
}

function downloadCsv(headers: string[], rows: (string | number | null)[][], filename: string) {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export default function AnomaliesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [payPeriod, setPayPeriod] = useState('');
  const [focused, setFocused] = useState(false);
  const [data, setData] = useState<FlaggedRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (!ALLOWED_ROLES.includes(getRole() ?? '')) { router.push('/dashboard'); return; }
    setAuthorized(true);
    api.get<{ payPeriod: string }>('/dashboard/latest-month')
      .then((r) => setPayPeriod(r.payPeriod))
      .catch(() => setPayPeriod('2020-01'));
  }, [router]);

  useEffect(() => {
    if (authorized && payPeriod) load();
  }, [authorized, payPeriod]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<FlaggedRecord[]>(`/rules/flags?payPeriod=${payPeriod}`);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const rows = await api.get<Record<string, string>[]>(`/dashboard/export?payPeriod=${payPeriod}`);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    downloadCsv(headers, rows.map((r) => headers.map((h) => r[h] ?? '')), `payroll-anomalies-${payPeriod}.csv`);
  };

  if (!authorized) return null;

  const errorCount = data?.filter((r) => r.Severity === 'ERROR').length ?? 0;
  const warnCount = data?.filter((r) => r.Severity === 'WARNING').length ?? 0;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Anomalies & Flags</h1>
              <p style={styles.pageSubtitle}>Review data quality flags detected by the rule engine</p>
            </div>
            <div style={styles.headingActions}>
              <div style={styles.periodRow}>
                <input style={styles.periodInput} type="text" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={focused || payPeriod ? '' : 'YYYY-MM'} />
                <button style={styles.loadBtn} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load Flags'}</button>
                <button style={styles.exportBtn} onClick={handleExport}>Export Report</button>
              </div>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {data && (
            <>
              {/* Summary pills */}
              <div style={styles.summaryRow}>
                <div style={styles.summaryPill}>
                  <span style={styles.summaryNum}>{data.length}</span>
                  <span style={styles.summaryLabel}>Total Flags</span>
                </div>
                <div style={{ ...styles.summaryPill, background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <span style={{ ...styles.summaryNum, color: '#dc2626' }}>{errorCount}</span>
                  <span style={styles.summaryLabel}>Errors</span>
                </div>
                <div style={{ ...styles.summaryPill, background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <span style={{ ...styles.summaryNum, color: '#d97706' }}>{warnCount}</span>
                  <span style={styles.summaryLabel}>Warnings</span>
                </div>
              </div>

              {data.length === 0 ? (
                <div style={styles.emptyState}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={1.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>No flags found for this pay period</p>
                </div>
              ) : (
                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Flag ID</th>
                        <th style={styles.th}>Record ID</th>
                        <th style={styles.th}>Flag Type</th>
                        <th style={styles.th}>Severity</th>
                        <th style={styles.th}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.Flag_ID}>
                          <td style={styles.td}>{row.Flag_ID}</td>
                          <td style={styles.td}>{row.Record_ID}</td>
                          <td style={styles.td}><span style={styles.flagTag}>{row.Flag_Type.replace(/_/g, ' ')}</span></td>
                          <td style={styles.td}>
                            <span style={{ ...styles.sevBadge, ...(row.Severity === 'ERROR' ? styles.sevError : styles.sevWarn) }}>
                              {row.Severity}
                            </span>
                          </td>
                          <td style={{ ...styles.td, maxWidth: 360, wordBreak: 'break-word' }}>{row.Description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!data && !loading && !error && (
            <div style={styles.emptyState}>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Enter a pay period and click Load Flags</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9' },
  rightColumn: { marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  main: { flex: 1, padding: '32px 40px' },
  pageHeading: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  headingActions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 },
  periodRow: { display: 'flex', gap: 10 },
  periodInput: { padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: 168, background: '#fff', outline: 'none', color: '#0f172a' },
  loadBtn: { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorBox: { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 },
  summaryRow: { display: 'flex', gap: 12, marginBottom: 20 },
  summaryPill: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  summaryNum: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  tableCard: { background: '#fff', borderRadius: 12, padding: '0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #f1f5f9', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '12px 16px', borderBottom: '1px solid #f8fafc', color: '#374151', verticalAlign: 'top' },
  flagTag: { display: 'inline-block', background: '#f0f9ff', color: '#0369a1', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  sevBadge: { display: 'inline-block', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  sevError: { background: '#fef2f2', color: '#dc2626' },
  sevWarn: { background: '#fffbeb', color: '#d97706' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 12 },
};
