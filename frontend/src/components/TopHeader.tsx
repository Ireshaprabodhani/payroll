'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getRole, getUsername, openPowerBiSignOut } from '@/lib/auth';

export default function TopHeader() {
  const router = useRouter();
  const username = getUsername() ?? '';
  const role = getRole() ?? '';
  const initials = username.slice(0, 2).toUpperCase() || 'U';
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const logout = () => {
    clearSession();
    openPowerBiSignOut();
    router.push('/login');
  };

  return (
    <header style={styles.header}>
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input style={styles.searchInput} type="text" placeholder="Search…" />
      </div>

      <div style={styles.rightControls}>
        <div ref={box} style={styles.avatarWrapper}>
          <span style={styles.fullName}>{username}</span>
          <button style={styles.avatarButton} onClick={() => setOpen((v) => !v)} aria-label="Account menu">
            <div style={styles.avatar}>{initials}</div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {open && (
            <div style={styles.dropdown}>
              <div style={styles.who}>{username}</div>
              <div style={styles.role}>{role}</div>
              <button style={styles.logout} onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    background: '#fff',
    padding: '0 40px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: 12, display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  searchInput: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: 20,
    padding: '8px 16px 8px 38px',
    fontSize: 14,
    color: '#374151',
    width: 280,
    outline: 'none',
  },
  rightControls: { display: 'flex', alignItems: 'center', gap: 8 },
  fullName: { fontSize: 14, fontWeight: 600, color: '#0f172a' },
  avatarWrapper: { position: 'relative', display: 'flex', alignItems: 'center', gap: 8 },
  avatarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#2563eb',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 48,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    minWidth: 180,
    boxShadow: '0 8px 24px rgba(15,23,42,.12)',
    padding: 10,
    zIndex: 300,
  },
  who: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  role: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  logout: {
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: '#fee2e2',
    color: '#b91c1c',
    borderRadius: 6,
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },
};