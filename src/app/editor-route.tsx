import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { tr } from '../i18n/tr';

export function EditorRoute({ children }: { children: ReactNode }) {
  const { id = '' } = useParams();
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

  if (meQuery.data.role === 'VIEWER') {
    return <Navigate to={`/dashboards/${id}`} replace />;
  }

  return <>{children}</>;
}
