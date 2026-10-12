'use client';

const TOKEN_KEY = 'payroll_token';
const ROLE_KEY = 'payroll_role';
const USER_KEY = 'payroll_user';
const DEPT_KEY = 'payroll_dept';

export function saveSession(token: string, role: string, username: string, department: string | null = null) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USER_KEY, username);
  if (department) {
    localStorage.setItem(DEPT_KEY, department);
  } else {
    localStorage.removeItem(DEPT_KEY);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY);
}

export function getDepartment(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEPT_KEY);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEPT_KEY);
}

// Microsoft's sign-out page refuses to load inside a frame, so it opens in a popup.
const POWERBI_SIGNOUT_URL = 'https://app.powerbi.com/Signout';

export function openPowerBiSignOut() {
  if (typeof window === 'undefined') return;
  window.open(POWERBI_SIGNOUT_URL, 'powerbi-signout', 'width=520,height=640');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
