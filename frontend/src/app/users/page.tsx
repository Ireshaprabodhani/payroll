'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, getRole, getUsername } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

interface UserRecord {
  Username: string;
  Role: string;
  Department: string | null;
}

const ROLE_OPTIONS = ['Admin', 'Payroll Manager', 'Executive', 'End User'];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin: { bg: '#ede9fe', color: '#7c3aed' },
  'Payroll Manager': { bg: '#dbeafe', color: '#2563eb' },
  Executive: { bg: '#dcfce7', color: '#16a34a' },
  'End User': { bg: '#f1f5f9', color: '#475569' },
};

export default function UsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const currentUser = getUsername() ?? '';

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('End User');
  const [newDepartment, setNewDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (getRole() !== 'Admin') { router.push('/dashboard'); return; }
    setAuthorized(true);
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<UserRecord[]>('/users');
      setUsers(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/users', {
        username: newUsername,
        password: newPassword,
        role: newRole,
        department: newDepartment.trim() || undefined,
      });
      setNewUsername(''); setNewPassword(''); setNewRole('End User'); setNewDepartment('');
      setShowForm(false);
      await loadUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${encodeURIComponent(username)}`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
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
              <h1 style={styles.pageTitle}>Users & Roles</h1>
              <p style={styles.pageSubtitle}>Manage system users and their access levels</p>
            </div>
            <button style={styles.addBtn} onClick={() => { setShowForm(!showForm); setFormError(''); }}>
              {showForm ? 'Cancel' : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ marginRight: 6 }}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add User
                </>
              )}
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Create form */}
          {showForm && (
            <div style={styles.formCard}>
              <h3 style={styles.formTitle}>New User</h3>
              <form onSubmit={handleCreate} style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Username *</label>
                    <input style={styles.input} type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="e.g. john_doe" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Password * (min 6 chars)</label>
                    <input style={styles.input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Role *</label>
                    <select style={styles.input} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Department (optional)</label>
                    <input style={styles.input} type="text" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="Leave blank if N/A" />
                  </div>
                </div>
                {formError && <div style={styles.formError}>{formError}</div>}
                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn} disabled={submitting}>{submitting ? 'Creating…' : 'Create User'}</button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div style={styles.emptyState}><p style={{ color: '#94a3b8' }}>Loading users…</p></div>
          ) : (
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Department</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleStyle = ROLE_COLORS[user.Role] ?? { bg: '#f1f5f9', color: '#475569' };
                    const isSelf = user.Username === currentUser;
                    return (
                      <tr key={user.Username}>
                        <td style={styles.td}>
                          <div style={styles.userCell}>
                            <div style={styles.userAvatar}>{user.Username.slice(0, 2).toUpperCase()}</div>
                            <span style={{ fontWeight: 600 }}>{user.Username}</span>
                            {isSelf && <span style={styles.selfBadge}>You</span>}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.roleBadge, background: roleStyle.bg, color: roleStyle.color }}>{user.Role}</span>
                        </td>
                        <td style={{ ...styles.td, color: '#64748b' }}>{user.Department ?? '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <button
                            style={{ ...styles.deleteBtn, opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                            onClick={() => !isSelf && handleDelete(user.Username)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot delete your own account' : `Delete ${user.Username}`}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
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
  pageHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  pageTitle: { margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#0f172a' },
  pageSubtitle: { margin: 0, fontSize: 13, color: '#64748b' },
  addBtn: { display: 'flex', alignItems: 'center', padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  errorBox: { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 20 },
  formCard: { background: '#fff', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: 20 },
  formTitle: { margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#64748b' },
  input: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' },
  formError: { padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
  formActions: { display: 'flex', gap: 10 },
  submitBtn: { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '12px 20px', background: '#f8fafc', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #f1f5f9', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '14px 20px', borderBottom: '1px solid #f8fafc', color: '#374151' },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  selfBadge: { background: '#f0f9ff', color: '#0369a1', fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 600 },
  roleBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  deleteBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 12 },
};
