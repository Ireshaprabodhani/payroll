'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, clearSession, openPowerBiSignOut } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

const EMBED_URL =
  process.env.NEXT_PUBLIC_POWERBI_EMBED_URL ??
  'https://app.powerbi.com/reportEmbed?reportId=1254c394-a16b-4a65-9c1f-afae329d779a&pageName=8336852d18920f18055d&autoAuth=true';

// The full Power BI address refuses to load inside a frame, so it is only used for the new-tab link.
const REPORT_URL =
  process.env.NEXT_PUBLIC_POWERBI_REPORT_URL ??
  'https://app.powerbi.com/groups/me/reports/1254c394-a16b-4a65-9c1f-afae329d779a/8336852d18920f18055d?experience=power-bi';

export default function PowerBiPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  const handleSignOut = () => {
    clearSession();
    openPowerBiSignOut();
    router.push('/login');
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar currentPath={pathname} />
      <div style={styles.rightColumn}>
        <TopHeader />
        <main style={styles.main}>
          <div style={styles.pageHeading}>
            <div>
              <h1 style={styles.pageTitle}>Power BI Analytics</h1>
              <p style={styles.pageSubtitle}>Live payroll data quality report — sign in with your Power BI account if prompted</p>
            </div>
            <div style={styles.headingActions}>
              <a style={styles.openBtn} href={REPORT_URL} target="_blank" rel="noopener noreferrer">Open in new tab</a>
              <button style={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
            </div>
          </div>

          <div style={styles.frameCard}>
            <iframe title="SecureLock Global — Payroll Data Quality" src={EMBED_URL} style={styles.frame} allowFullScreen />
          </div>
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: { display: 'flex', minHeight: '100vh', background: '#f1f5f9' },
  rightColumn: { marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  main: { flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column' },
  pageHeading: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  headingActions: { display: 'flex', alignItems: 'center', gap: 10 },
  openBtn: { padding: '9px 18px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  signOutBtn: { padding: '9px 18px', background: '#fff', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  frameCard: { flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', minHeight: 720 },
  frame: { width: '100%', height: '100%', minHeight: 720, border: 'none', display: 'block' },
};
