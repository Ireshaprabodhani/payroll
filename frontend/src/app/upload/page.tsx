'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getRole } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

interface UploadResult {
  inserted: number;
  importMonth: string;
}

interface ProcessResult {
  payPeriod: string;
  generated: number;
  seeded: number;
  totalExtractRows: number;
  totalFlagsInserted: number;
  dqScore: number;
  flagSummary: Record<string, number>;
}

export default function UploadPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [importMonth, setImportMonth] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const r = getRole() ?? '';
    if (!['Admin', 'Payroll Manager'].includes(r)) { router.push('/dashboard'); return; }
    setAuthorized(true);
  }, [router]);

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !importMonth) return;
    setError('');
    setUploadResult(null);
    setProcessResult(null);

    try {
      // Step 1: Upload
      setStep('uploading');
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await api.postForm<UploadResult>(
        `/attendance/upload?importMonth=${importMonth}`,
        formData,
      );
      setUploadResult(uploaded);

      // Step 2: Process (calculate → seed → rules)
      setStep('processing');
      const processed = await api.post<ProcessResult>(
        `/payroll/process?payPeriod=${importMonth}`,
      );
      setProcessResult(processed);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
      setStep('idle');
    }
  };

  if (!authorized) return null;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Import Attendance</h1>
              <p style={styles.pageSubtitle}>Upload a monthly CSV punch file to calculate payroll and run quality rules</p>
            </div>
          </div>

        <div style={styles.card}>
          <form onSubmit={handleUploadAndProcess} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Import Month (YYYY-MM)</label>
              <input
                style={styles.input}
                type="text"
                value={importMonth}
                onChange={(e) => setImportMonth(e.target.value)}
                placeholder="2024-01"
                pattern="\d{4}-\d{2}"
                title="Format: YYYY-MM"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>CSV File</label>
              <p style={styles.fieldHint}>
                Required columns: Employee_ID, Punch_Date, Punch_In, Punch_Out, Department, Cost_Centre
              </p>
              <input
                ref={fileRef}
                style={styles.fileInput}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              style={styles.button}
              type="submit"
              disabled={step !== 'idle' && step !== 'done'}
            >
              {step === 'uploading' ? 'Uploading CSV…'
                : step === 'processing' ? 'Calculating payroll & running rules…'
                : 'Upload & Process'}
            </button>
          </form>
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div style={{ ...styles.card, ...styles.successCard }}>
            <h3 style={styles.resultTitle}>✓ File Uploaded</h3>
            <p><strong>{uploadResult.inserted}</strong> attendance rows imported for <strong>{uploadResult.importMonth}</strong>.</p>
          </div>
        )}

        {/* Process result */}
        {processResult && (
          <div style={{ ...styles.card, marginTop: 16 }}>
            <h3 style={styles.resultTitle}>Pipeline Complete</h3>
            <div style={styles.statsGrid}>
              <StatBox label="Payroll Rows" value={processResult.totalExtractRows} />
              <StatBox label="DQ Score" value={`${processResult.dqScore}%`} highlight={processResult.dqScore < 80} />
              <StatBox label="Flags Found" value={processResult.totalFlagsInserted} highlight={processResult.totalFlagsInserted > 0} />
            </div>

            {Object.keys(processResult.flagSummary).length > 0 && (
              <div style={styles.flagTable}>
                <h4 style={styles.flagTitle}>Flag Breakdown</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Flag Type</th>
                      <th style={styles.th}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(processResult.flagSummary).map(([type, count]) => (
                      <tr key={type}>
                        <td style={styles.td}>{type}</td>
                        <td style={styles.td}>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button style={styles.navBtnPrimary} onClick={() => router.push('/dashboard')}>
              View Full Dashboard →
            </button>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ ...styles.statBox, ...(highlight ? styles.statBoxHighlight : {}) }}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9' },
  rightColumn: { marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  main: { flex: 1, padding: '32px 40px' },
  pageHeading: { marginBottom: 28 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '28px 32px', marginBottom: 0, border: '1px solid #f1f5f9' },
  successCard: { border: '1.5px solid #16a34a', marginTop: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  fieldHint: { margin: '0 0 6px', fontSize: 12, color: '#94a3b8' },
  input: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  fileInput: { padding: '8px 0', fontSize: 14 },
  error: { margin: 0, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
  button: { padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  resultTitle: { margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#0f172a' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statBox: { background: '#f8fafc', borderRadius: 10, padding: '16px', textAlign: 'center', border: '1px solid #f1f5f9' },
  statBoxHighlight: { background: '#fef2f2', border: '1px solid #fecaca' },
  statValue: { fontSize: 28, fontWeight: 700, color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  flagTable: { marginBottom: 20 },
  flagTitle: { margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#374151' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #f1f5f9' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f8fafc', color: '#374151' },
  navBtnPrimary: { padding: '12px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
