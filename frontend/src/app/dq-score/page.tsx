'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

interface DqScoreResponse {
  payPeriod: string;
  totalRows: number;
  flaggedRows: number;
  dqScore: number;
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

export default function DqScorePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [payPeriod, setPayPeriod] = useState('2020-01');
  const [data, setData] = useState<DqScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
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
      const res = await api.get<DqScoreResponse>(`/rules/dq-score?payPeriod=${payPeriod}`);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load DQ score');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      ['Pay Period', 'Total Rows', 'Flagged Rows', 'Clean Rows', 'DQ Score (%)'],
      [[data.payPeriod, data.totalRows, data.flaggedRows, data.totalRows - data.flaggedRows, data.dqScore]],
      `dq-score-${payPeriod}.csv`,
    );
  };

  const dqColor = (s: number) => s >= 90 ? '#16a34a' : s >= 70 ? '#f59e0b' : '#dc2626';
  const dqBg = (s: number) => s >= 90 ? '#dcfce7' : s >= 70 ? '#fffbeb' : '#fef2f2';
  const dqLabel = (s: number) => s >= 90 ? 'Excellent' : s >= 70 ? 'Acceptable' : 'Needs Attention';

  if (!authorized) return null;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Data Quality Score</h1>
              <p style={styles.pageSubtitle}>Overall payroll data quality for a given pay period</p>
            </div>
            <div style={styles.headingActions}>
              <div style={styles.periodRow}>
                <input style={styles.periodInput} type="text" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} placeholder="YYYY-MM" />
                <button style={styles.loadBtn} onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load Score'}</button>
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
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {data && (
            <>
              {/* Score hero card */}
              <div style={{ ...styles.heroCard, background: dqBg(data.dqScore), borderColor: dqColor(data.dqScore) }}>
                <div style={styles.heroLeft}>
                  <p style={styles.heroLabel}>Pay Period: {data.payPeriod}</p>
                  <div style={{ ...styles.heroScore, color: dqColor(data.dqScore) }}>{data.dqScore}%</div>
                  <span style={{ ...styles.heroStatusBadge, background: dqColor(data.dqScore), color: '#fff' }}>
                    {dqLabel(data.dqScore)}
                  </span>
                </div>
                <div style={styles.heroRight}>
                  <div style={styles.progressContainer}>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${data.dqScore}%`, background: dqColor(data.dqScore) }} />
                    </div>
                    <div style={styles.progressLabels}>
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={styles.statsGrid}>
                {[
                  { label: 'Total Rows', value: data.totalRows, color: '#2563eb', bg: '#dbeafe' },
                  { label: 'Flagged Rows', value: data.flaggedRows, color: '#dc2626', bg: '#fee2e2' },
                  { label: 'Clean Rows', value: data.totalRows - data.flaggedRows, color: '#16a34a', bg: '#dcfce7' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
                    <div style={{ ...styles.statNum, color }}>{value}</div>
                    <div style={styles.statLabel}>{label}</div>
                    <div style={{ ...styles.statBar, background: '#f1f5f9' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: bg, width: `${data.totalRows > 0 ? (value / data.totalRows) * 100 : 0}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!data && !loading && !error && (
            <div style={styles.emptyState}>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Enter a pay period and click Load Score</p>
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
  heroCard: { borderRadius: 16, padding: '32px 40px', border: '2px solid', display: 'flex', gap: 40, alignItems: 'center', marginBottom: 24 },
  heroLeft: { display: 'flex', flexDirection: 'column', gap: 8 },
  heroLabel: { margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' },
  heroScore: { fontSize: 72, fontWeight: 800, lineHeight: 1, margin: '4px 0' },
  heroStatusBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, width: 'fit-content' },
  heroRight: { flex: 1 },
  progressContainer: {},
  progressTrack: { height: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 8, transition: 'width 0.6s ease' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 },
  statCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  statNum: { fontSize: 32, fontWeight: 700, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  statBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 12 },
};
