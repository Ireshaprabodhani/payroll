'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getRole } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

const ALLOWED_ROLES = ['Admin', 'Payroll Manager', 'Executive'];

interface PayrollExtractRow {
  Record_ID: number;
  Employee_ID: string;
  Department: string | null;
  Cost_Centre: string | null;
  Pay_Period: string;
  Pay_Type: string;
  Hours_Worked: string | null;
  Pay_Amount: string | null;
  Source: string;
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

export default function PaymentSummaryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [payPeriod, setPayPeriod] = useState('2020-01');
  const [data, setData] = useState<PayrollExtractRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (!ALLOWED_ROLES.includes(getRole() ?? '')) { router.push('/dashboard'); return; }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (authorized) { load(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<PayrollExtractRow[]>(`/payroll/extract?payPeriod=${payPeriod}`);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load payment summary');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      ['Record ID', 'Employee ID', 'Department', 'Cost Centre', 'Pay Period', 'Pay Type', 'Hours Worked', 'Pay Amount', 'Source'],
      data.map((r) => [r.Record_ID, r.Employee_ID, r.Department, r.Cost_Centre, r.Pay_Period, r.Pay_Type, r.Hours_Worked, r.Pay_Amount, r.Source]),
      `payment-summary-${payPeriod}.csv`,
    );
  };

  if (!authorized) return null;

  const totalPay = data?.reduce((sum, r) => sum + parseFloat(r.Pay_Amount ?? '0'), 0) ?? 0;
  const uniqueEmps = data ? new Set(data.map((r) => r.Employee_ID)).size : 0;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Payment Summary</h1>
              <p style={styles.pageSubtitle}>Full payroll extract for a given pay period</p>
            </div>
            <div style={styles.headingActions}>
              <div style={styles.periodRow}>
                <input style={styles.periodInput} type="text" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} placeholder="YYYY-MM" />
                <button style={styles.loadBtn} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
              </div>
              {data && data.length > 0 && (
                <button style={styles.exportBtn} onClick={handleExport}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {data && (
            <>
              {/* Stats bar */}
              <div style={styles.statsBar}>
                <div style={styles.statItem}>
                  <span style={styles.statNum}>{data.length}</span>
                  <span style={styles.statLabel}>Total Records</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                  <span style={styles.statNum}>{uniqueEmps}</span>
                  <span style={styles.statLabel}>Employees</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                  <span style={styles.statNum}>${totalPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span style={styles.statLabel}>Total Pay</span>
                </div>
              </div>

              <div style={styles.tableCard}>
                <div style={styles.tableScroll}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Record ID', 'Employee ID', 'Department', 'Cost Centre', 'Pay Type', 'Hours Worked', 'Pay Amount', 'Source'].map((h) => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <tr key={row.Record_ID}>
                          <td style={styles.td}>{row.Record_ID}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{row.Employee_ID}</td>
                          <td style={styles.td}>{row.Department ?? '—'}</td>
                          <td style={styles.td}>{row.Cost_Centre ?? '—'}</td>
                          <td style={styles.td}><span style={styles.typeTag}>{row.Pay_Type}</span></td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{row.Hours_Worked ? parseFloat(row.Hours_Worked).toFixed(2) : '—'}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                            {row.Pay_Amount ? `$${parseFloat(row.Pay_Amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={styles.td}><span style={styles.sourceTag}>{row.Source}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!data && !loading && !error && (
            <div style={styles.emptyState}>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Enter a pay period and click Load</p>
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
  statsBar: { display: 'flex', background: '#fff', borderRadius: 12, padding: '16px 24px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', gap: 0 },
  statItem: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 20px', flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 700, color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, background: '#f1f5f9', margin: '0 4px' },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 },
  th: { textAlign: 'left', padding: '12px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #f1f5f9', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' },
  td: { padding: '11px 14px', borderBottom: '1px solid #f8fafc', color: '#374151', whiteSpace: 'nowrap' },
  typeTag: { background: '#ede9fe', color: '#7c3aed', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  sourceTag: { background: '#f0f9ff', color: '#0369a1', borderRadius: 5, padding: '2px 8px', fontSize: 11 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 12 },
};
