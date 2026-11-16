import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { tr } from '../i18n/tr';
import { useNotificationsRealtimeSync } from '../features/notifications/use-notifications-realtime-sync';
import { useUnreadTitleBadge } from '../features/notifications/use-unread-title-badge';
import { useRealtimeConnection } from '../lib/realtime';

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const meQuery = useMeQuery();
  // Super admin sayfalari ProtectedRoute disinda - socket'i burada aciyoruz ki
  // 'platform-admins' room'una gelen olaylar (orn. yeni destek talebi) anlik dussun.
  const isPlatformAdmin = !!meQuery.data?.isPlatformAdmin;
  useRealtimeConnection(isPlatformAdmin);
  // Zil ikonu (yeni destek talebi bildirimi vb.) super admin sayfalarinda da anlik guncellensin.
  useNotificationsRealtimeSync();
  useUnreadTitleBadge(isPlatformAdmin);

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

  if (!meQuery.data.isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
