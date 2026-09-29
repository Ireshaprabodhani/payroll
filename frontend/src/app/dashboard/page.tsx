'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getRole, getUsername, clearSession } from '@/lib/auth';
import { api } from '@/lib/api';

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

export default function DashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [payPeriod, setPayPeriod] = useState('2024-01');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    setRole(getRole() ?? '');
    setUsername(getUsername() ?? '');
    setAuthorized(true);
  }, [router]);

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

  const handleLogout = () => { clearSession(); router.push('/login'); };

  const dqColor = (score: number) =>
    score >= 90 ? '#27ae60' : score >= 70 ? '#f39c12' : '#e74c3c';

  if (!authorized) return null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Payroll Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>{role}: {username}</span>
          {['Admin', 'Payroll Manager'].includes(role) && (
            <button style={styles.navBtn} onClick={() => router.push('/upload')}>Upload CSV</button>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.pageTitle}>Data Quality Dashboard</h2>
        <p style={styles.pageDesc}>SecureLock Global — Payroll Reporting System</p>

        {/* Controls */}
        <div style={styles.controls}>
          <input
            style={styles.periodInput}
            type="text"
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value)}
            placeholder="YYYY-MM"
            pattern="\d{4}-\d{2}"
          />
          <button style={styles.loadBtn} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load Report'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {data && (
          <>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <KpiCard label="Employees" value={data.uniqueEmployees} />
              <KpiCard label="Payroll Rows" value={data.totalExtractRows} />
              <KpiCard label="Total Pay" value={`$${Number(data.totalPayAmount).toLocaleString()}`} />
              <KpiCard label="Flags" value={data.totalFlags} highlight={data.totalFlags > 0} />
            </div>

            {/* DQ Score */}
            <div style={styles.dqCard}>
              <div>
                <h3 style={styles.dqTitle}>Data Quality Score</h3>
                <p style={styles.dqPeriod}>Pay Period: <strong>{data.payPeriod}</strong></p>
              </div>
              <div style={{ ...styles.dqScore, color: dqColor(data.dqScore) }}>
                {data.dqScore}%
              </div>
            </div>

            {/* Flag breakdown */}
            {Object.keys(data.flagBreakdown).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Flags by Type</h3>
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
                        <td style={styles.td}><span style={styles.flagTag}>{type}</span></td>
                        <td style={styles.td}>{count}</td>
                        <td style={styles.td}>{FLAG_RULE_MAP[type] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Severity breakdown */}
            {Object.keys(data.severityBreakdown).length > 0 && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Flags by Severity</h3>
                <div style={styles.severityRow}>
                  {Object.entries(data.severityBreakdown).map(([sev, count]) => (
                    <div key={sev} style={{ ...styles.sevBox, background: sev === 'ERROR' ? '#fff0f0' : '#fffbe6', borderColor: sev === 'ERROR' ? '#ffcccc' : '#ffe082' }}>
                      <div style={{ ...styles.sevCount, color: sev === 'ERROR' ? '#c0392b' : '#e67e22' }}>{count}</div>
                      <div style={styles.sevLabel}>{sev}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import info */}
            {data.lastImport && (
              <div style={styles.importInfo}>
                <strong>Last Import:</strong> {data.lastImport.Source_File} —&nbsp;
                {data.lastImport.Row_Count} rows imported on&nbsp;
                {new Date(data.lastImport.Imported_At).toLocaleString()}
              </div>
            )}
          </>
        )}

        {!data && !loading && !error && (
          <p style={styles.emptyMsg}>Enter a pay period (YYYY-MM) and click Load Report.</p>
        )}
      </main>
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

function KpiCard({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ ...styles.kpiBox, ...(highlight ? styles.kpiHighlight : {}) }}>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f0f2f5' },
  header: { background: '#2c3e8a', color: '#fff', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  userBadge: { fontSize: 12, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 20 },
  navBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  logoutBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 900, margin: '0 auto', padding: '40px 20px' },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  pageDesc: { color: '#888', marginBottom: 28, fontSize: 14 },
  controls: { display: 'flex', gap: 12, marginBottom: 28 },
  periodInput: { padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, width: 140 },
  loadBtn: { padding: '10px 20px', background: '#2c3e8a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { padding: '12px 16px', background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 8, color: '#c0392b', fontSize: 13 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 },
  kpiBox: { background: '#fff', borderRadius: 12, padding: '20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1.5px solid #e8eaf6' },
  kpiHighlight: { border: '1.5px solid #ffcccc', background: '#fff5f5' },
  kpiValue: { fontSize: 28, fontWeight: 700, color: '#2c3e8a' },
  kpiLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  dqCard: { background: '#fff', borderRadius: 12, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20, border: '1.5px solid #e8eaf6' },
  dqTitle: { margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1a1a2e' },
  dqPeriod: { margin: 0, fontSize: 13, color: '#888' },
  dqScore: { fontSize: 52, fontWeight: 800 },
  card: { background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20, border: '1.5px solid #e8eaf6' },
  cardTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '9px 12px', background: '#f5f6ff', color: '#555', fontWeight: 600, borderBottom: '2px solid #e8eaf6' },
  td: { padding: '9px 12px', borderBottom: '1px solid #f0f2f5', color: '#333' },
  flagTag: { display: 'inline-block', background: '#fff0f0', color: '#c0392b', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600, letterSpacing: 0.3 },
  severityRow: { display: 'flex', gap: 16 },
  sevBox: { flex: 1, borderRadius: 10, padding: '18px', textAlign: 'center', border: '1.5px solid' },
  sevCount: { fontSize: 32, fontWeight: 700 },
  sevLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  importInfo: { background: '#f8f9ff', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#555', border: '1px solid #e8eaf6' },
  emptyMsg: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 60 },
};
