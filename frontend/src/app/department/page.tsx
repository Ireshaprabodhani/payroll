'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getRole } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const ALLOWED_ROLES = ['Admin', 'Payroll Manager', 'HR'];

interface DashboardSummary {
  payPeriod: string;
  department: string;
  totalExtractRows: number;
  uniqueEmployees: number;
  totalPayAmount: string;
  totalFlags: number;
  flaggedRows: number;
  dqScore: number;
  flagBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  lastImport: { Import_Month: string; Source_File: string; Row_Count: number; Imported_At: string } | null;
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

export default function DepartmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [payPeriod, setPayPeriod] = useState('2020-01');
  const [department, setDepartment] = useState('');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (!ALLOWED_ROLES.includes(getRole() ?? '')) { router.push('/dashboard'); return; }
    setAuthorized(true);
  }, [router]);

  const load = async () => {
    if (!department.trim()) { setError('Please enter a department name'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardSummary>(
        `/dashboard/summary/department?payPeriod=${payPeriod}&department=${encodeURIComponent(department.trim())}`,
      );
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      ['Pay Period', 'Department', 'Total Rows', 'Unique Employees', 'Total Pay', 'Total Flags', 'Flagged Rows', 'DQ Score (%)'],
      [[data.payPeriod, data.department, data.totalExtractRows, data.uniqueEmployees, data.totalPayAmount, data.totalFlags, data.flaggedRows, data.dqScore]],
      `department-${department}-${payPeriod}.csv`,
    );
  };

  const dqColor = (s: number) => s >= 90 ? '#16a34a' : s >= 70 ? '#f59e0b' : '#dc2626';

  if (!authorized) return null;

  const barData = data ? Object.entries(data.flagBreakdown).map(([name, value]) => ({ name: name.replace(/_/g, ' ').slice(0, 14), value })) : [];

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Department Analysis</h1>
              <p style={styles.pageSubtitle}>View payroll quality metrics scoped to a specific department</p>
            </div>
            {data && (
              <button style={styles.exportBtn} onClick={handleExport}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={styles.filterCard}>
            <div style={styles.filterRow}>
              <div style={styles.filterField}>
                <label style={styles.filterLabel}>Pay Period</label>
                <input style={{ ...styles.filterInput, width: 168 }} type="text" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} placeholder="YYYY-MM" />
              </div>
              <div style={{ ...styles.filterField, flex: 2 }}>
                <label style={styles.filterLabel}>Department Name</label>
                <input style={styles.filterInput} type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Engineering" />
              </div>
              <button style={styles.loadBtn} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Analyse'}</button>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {data && (
            <>
              {/* KPI row */}
              <div style={styles.kpiGrid}>
                {[
                  { label: 'DQ Score', value: `${data.dqScore}%`, bg: '#ede9fe', color: dqColor(data.dqScore) },
                  { label: 'Payroll Rows', value: data.totalExtractRows, bg: '#dcfce7', color: '#16a34a' },
                  { label: 'Flagged Records', value: data.flaggedRows, bg: '#fee2e2', color: '#dc2626' },
                  { label: 'Clean Records', value: data.totalExtractRows - data.flaggedRows, bg: '#dbeafe', color: '#2563eb' },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} style={{ ...styles.kpiCard, borderTop: `3px solid ${color}` }}>
                    <div style={{ ...styles.kpiValue, color }}>{value}</div>
                    <div style={styles.kpiLabel}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {barData.length > 0 && (
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>Flags by Type — {data.department}</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {Object.keys(data.flagBreakdown).length === 0 && (
                <div style={styles.emptyState}>
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={1.5}><polyline points="20 6 9 17 4 12" /></svg>
                  <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>No flags for this department</p>
                </div>
              )}
            </>
          )}

          {!data && !loading && !error && (
            <div style={styles.emptyState}>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Enter pay period and department name above, then click Analyse</p>
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
  pageHeading: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  exportBtn: { display: 'flex', alignItems: 'center', padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  filterCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 20 },
  filterRow: { display: 'flex', gap: 12, alignItems: 'flex-end' },
  filterField: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  filterLabel: { fontSize: 12, fontWeight: 600, color: '#64748b' },
  filterInput: { padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none', color: '#0f172a' },
  loadBtn: { padding: '9px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  errorBox: { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 },
  kpiCard: { background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  kpiValue: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  kpiLabel: { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  chartCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 20 },
  chartTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 12 },
};
