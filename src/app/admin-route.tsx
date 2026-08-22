import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { tr } from '../i18n/tr';

/** OWNER/ADMIN'e ozel ekranlar icin (Ayarlar - denetim kaydi, zamanlanmis raporlar, alarmlar). */
export function AdminRoute({ children }: { children: ReactNode }) {
  const meQuery = useMeQuery();

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-app-muted">
        {tr.common.loading}
      </div>
    );
  }

  if (!meQuery.data) {
    return <Navigate to="/login" replace />;
  }

  if (meQuery.data.role !== 'OWNER' && meQuery.data.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
