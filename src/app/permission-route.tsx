import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import type { PermissionAction } from '../lib/api';
import { tr } from '../i18n/tr';

interface PermissionRouteProps {
  children: ReactNode;
  pageKey: string;
  action: PermissionAction;
  tabKey?: string;
  /** Yetkisiz kullanicinin yonlendirilecegi yol. */
  redirectTo: string;
}

/** Belirli bir sayfa/aksiyon izni gerektiren rotalar icin genel guard - rol ismine
 * degil Permission sistemine gore karar verir (bkz. docs/PLAN_ROL_YONETIMI.md SS11). */
export function PermissionRoute({
  children,
  pageKey,
  action,
  tabKey,
  redirectTo,
}: PermissionRouteProps) {
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

  if (!hasPermission(meQuery.data.permissions, pageKey, action, tabKey)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
