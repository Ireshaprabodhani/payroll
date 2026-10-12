'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

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

const SEV_COLORS: Record<string, string> = {
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
};

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

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [payPeriod, setPayPeriod] = useState('');
  const [focused, setFocused] = useState(false);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
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
      const res = await api.get<DashboardSummary>(`/dashboard/summary?payPeriod=${payPeriod}`);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    const rows = await api.get<Record<string, string>[]>(`/dashboard/export?payPeriod=${payPeriod}`);
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    downloadCsv(headers, rows.map((r) => headers.map((h) => r[h] ?? '')), `payroll-anomalies-${payPeriod}.csv`);
  };

  const dqColor = (score: number) => score >= 90 ? '#16a34a' : score >= 70 ? '#f59e0b' : '#dc2626';

  if (!authorized) return null;

  const barData = data ? Object.entries(data.flagBreakdown).map(([name, value]) => ({ name: name.replace(/_/g, ' ').slice(0, 14), value })) : [];
  const pieData = data ? Object.entries(data.severityBreakdown).map(([name, value]) => ({ name, value })) : [];
  const cleanRecords = data ? data.totalExtractRows - data.flaggedRows : 0;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          {/* Page heading */}
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Dashboard</h1>
              <p style={styles.pageSubtitle}>SecureLock Global — Payroll Data Quality</p>
            </div>
            <div style={styles.headingActions}>
              <div style={styles.periodRow}>
                <input style={styles.periodInput} type="text" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder={focused || payPeriod ? '' : 'YYYY-MM'} />
                <button style={styles.loadBtn} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load Report'}</button>
                <button style={styles.exportBtn} onClick={handleExport} disabled={!data}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export Report
                </button>
              </div>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {!data && !loading && !error && (
            <div style={styles.emptyState}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" strokeWidth={1.5}>
                <path d="M9 17H5a2 2 0 00-2 2v0a2 2 0 002 2h14a2 2 0 002-2v0a2 2 0 00-2-2h-4" /><rect x="9" y="3" width="6" height="14" rx="1" />
              </svg>
              <p style={styles.emptyText}>Enter a pay period (YYYY-MM) and click Load Report</p>
            </div>
          )}

          {data && (
            <>
              {/* KPI Cards */}
              <div style={styles.kpiGrid}>
                <KpiCard label="Data Quality Score" value={`${data.dqScore}%`} iconBg="#ede9fe" iconColor="#7c3aed" note="Overall payroll quality"
                  icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} />
                <KpiCard label="Payroll Rows" value={data.totalExtractRows} iconBg="#dcfce7" iconColor="#16a34a" note={`${data.uniqueEmployees} employees`}
                  icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>} />
                <KpiCard label="Flagged Records" value={data.flaggedRows} iconBg="#fee2e2" iconColor="#dc2626" note={`${data.totalFlags} total flags`}
                  icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>} />
                <KpiCard label="Clean Records" value={cleanRecords} iconBg="#dbeafe" iconColor="#2563eb" note="No issues detected"
                  icon={<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>} />
              </div>

              {/* DQ score bar + last import */}
              <div style={styles.dqRow}>
                <div style={styles.dqCard}>
                  <div>
                    <p style={styles.dqLabel}>Pay Period</p>
                    <p style={styles.dqPeriodValue}>{data.payPeriod}</p>
                  </div>
                  <div style={{ flex: 1, padding: '0 24px' }}>
                    <p style={styles.dqLabel}>Quality Score</p>
                    <div style={styles.dqBarTrack}>
                      <div style={{ ...styles.dqBarFill, width: `${data.dqScore}%`, background: dqColor(data.dqScore) }} />
                    </div>
                    <p style={{ color: dqColor(data.dqScore), fontSize: 12, fontWeight: 700, marginTop: 4, margin: '4px 0 0' }}>{data.dqScore}%</p>
                  </div>
                  <span style={{ ...styles.dqBigScore, color: dqColor(data.dqScore) }}>{data.dqScore}%</span>
                </div>
                {data.lastImport && (
                  <div style={styles.importCard}>
                    <p style={styles.dqLabel}>Last Import</p>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{data.lastImport.Source_File}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{data.lastImport.Row_Count} rows · {new Date(data.lastImport.Imported_At).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Charts */}
              {(barData.length > 0 || pieData.length > 0) && (
                <div style={styles.chartsGrid}>
                  {barData.length > 0 && (
                    <div style={styles.chartCard}>
                      <h3 style={styles.chartTitle}>Flags by Type</h3>
                      <ResponsiveContainer width="100%" height={260}>
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
                  {pieData.length > 0 && (
                    <div style={styles.chartCard}>
                      <h3 style={styles.chartTitle}>Severity Distribution</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                            {pieData.map((entry, i) => <Cell key={i} fill={SEV_COLORS[entry.name] ?? '#94a3b8'} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Flag table */}
              {Object.keys(data.flagBreakdown).length > 0 && (
                <div style={styles.tableCard}>
                  <h3 style={styles.chartTitle}>Flag Details</h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Flag Type</th>
                        <th style={styles.th}>Count</th>
                        <th style={styles.th}>Rule</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.flagBreakdown).map(([type, count]) => (
                        <tr key={type}>
                          <td style={styles.td}><span style={styles.flagTag}>{type.replace(/_/g, ' ')}</span></td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{count}</td>
                          <td style={{ ...styles.td, color: '#64748b' }}>{FLAG_RULE_MAP[type] ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const FLAG_RULE_MAP: Record<string, string> = {
  DUPLICATE_PAYMENT: 'Rule 1',
  OUT_OF_RANGE_MONTHLY_HOURS_HIGH: 'Rule 2',
  OUT_OF_RANGE_MONTHLY_HOURS_LOW: 'Rule 2',
  OUT_OF_RANGE_DAILY_HOURS: 'Rule 2',
  MISSING_COST_CENTRE: 'Rule 3',
  INCOMPLETE_DEPARTMENT: 'Rule 4',
  INCOMPLETE_HOURS_WORKED: 'Rule 4',
  INCOMPLETE_PAY_AMOUNT: 'Rule 4',
  INVALID_COST_CENTRE: 'Rule 5',
  INVALID_DEPARTMENT: 'Rule 5',
  ALLOWANCE_MISSING_AMOUNT: 'Rule 6',
  NEGATIVE_OR_ZERO_PAYMENT: 'Rule 7',
  DEPARTMENT_MISMATCH: 'Rule 8',
};

function KpiCard({ label, value, iconBg, iconColor, note, icon }: {
  label: string; value: string | number; iconBg: string; iconColor: string; note: string; icon: React.ReactNode;
}) {
  return (
    <div style={kpiStyles.card}>
      <div style={kpiStyles.top}>
        <div>
          <p style={kpiStyles.label}>{label}</p>
          <p style={kpiStyles.value}>{value}</p>
        </div>
        <div style={{ ...kpiStyles.iconCircle, background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <p style={kpiStyles.note}>{note}</p>
    </div>
  );
}

const kpiStyles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  top: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  label: { margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a' },
  iconCircle: { width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  note: { margin: 0, fontSize: 12, color: '#94a3b8' },
};

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9' },
  rightColumn: { marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  main: { flex: 1, padding: '32px 40px' },
  pageHeading: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  headingActions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 },
  periodRow: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 8, boxShadow: '0 1px 3px rgba(15,23,42,.06)' },
  periodInput: { padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: 168, background: '#fff', color: '#0f172a', outline: 'none' },
  loadBtn: { padding: '9px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', padding: '9px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorBox: { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 },
  dqRow: { display: 'flex', gap: 16, marginBottom: 20 },
  dqCard: { flex: 1, background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16 },
  dqLabel: { margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  dqPeriodValue: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  dqBarTrack: { height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginTop: 4 },
  dqBarFill: { height: '100%', borderRadius: 6, transition: 'width 0.5s ease' },
  dqBigScore: { fontSize: 44, fontWeight: 800, marginLeft: 'auto', flexShrink: 0 },
  importCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', minWidth: 200 },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  chartCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  chartTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
  tableCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #f1f5f9', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '11px 14px', borderBottom: '1px solid #f8fafc', color: '#374151' },
  flagTag: { display: 'inline-block', background: '#fef2f2', color: '#dc2626', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
};
