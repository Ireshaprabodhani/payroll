import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Payroll Dashboard — SecureLock Global',
  description: 'Payroll Reporting and Data Quality Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f6fa' }}>
        {children}
      </body>
    </html>
  );
}
