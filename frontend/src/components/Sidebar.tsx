'use client';

import { useRouter } from 'next/navigation';
import { getRole, getUsername, clearSession } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  allowedRoles: string[] | 'all';
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    allowedRoles: 'all',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Import Attendance',
    href: '/upload',
    allowedRoles: ['Admin', 'Payroll Manager'],
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    label: 'Anomalies',
    href: '/anomalies',
    allowedRoles: ['Admin', 'Payroll Manager', 'Executive'],
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Department Analysis',
    href: '/department',
    allowedRoles: ['Admin', 'Payroll Manager', 'Executive'],
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Payment Summary',
    href: '/payment-summary',
    allowedRoles: ['Admin', 'Payroll Manager', 'Executive'],
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />
      </svg>
    ),
  },
  {
    label: 'Data Quality Score',
    href: '/dq-score',
    allowedRoles: 'all',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Users & Roles',
    href: '/users',
    allowedRoles: ['Admin'],
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

interface SidebarProps {
  currentPath: string;
}

export default function Sidebar({ currentPath }: SidebarProps) {
  const router = useRouter();
  const role = getRole() ?? '';
  const username = getUsername() ?? '';

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles === 'all' || item.allowedRoles.includes(role),
  );

  const initials = username.slice(0, 2).toUpperCase() || 'DQ';

  const handleSignOut = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <nav style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.logoCircle}>{initials}</div>
        <div style={styles.brandText}>
          <span style={styles.brandName}>DQ System</span>
          <span style={styles.roleBadge}>{role || 'User'}</span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Nav items */}
      <div style={styles.navList}>
        {visibleItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <button
              key={item.href}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
              onClick={() => router.push(item.href)}
            >
              <span style={{ ...styles.navIcon, color: isActive ? '#fff' : '#94a3b8' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sign Out */}
      <div style={styles.bottomSection}>
        <div style={styles.divider} />
        <button style={styles.signOutBtn} onClick={handleSignOut}>
          <span style={styles.navIcon}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 260,
    minWidth: 260,
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: '#1e2a3b',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    boxShadow: '4px 0 16px rgba(0,0,0,0.2)',
    overflowY: 'auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '24px 20px 20px',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  brandName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontSize: 11,
    borderRadius: 10,
    padding: '1px 8px',
    display: 'inline-block',
    width: 'fit-content',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '0 16px',
  },
  navList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    borderRadius: 8,
    transition: 'background 0.15s, color 0.15s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    borderLeft: '3px solid #3b82f6',
    paddingLeft: 9,
  },
  navIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  bottomSection: {
    padding: '8px 8px 16px',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#f87171',
    padding: '10px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: 500,
    borderRadius: 8,
    marginTop: 8,
    transition: 'background 0.15s',
  },
};
