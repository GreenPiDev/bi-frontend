import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMeQuery } from '../features/auth/use-auth';
import { useBrandOptionsRealtimeSync } from '../features/crm/use-brand-options-realtime-sync';
import { useCalendarEventsRealtimeSync } from '../features/crm/use-calendar-events-realtime-sync';
import { useDepartmentOptionsRealtimeSync } from '../features/crm/use-department-options-realtime-sync';
import { useIbanOptionsRealtimeSync } from '../features/crm/use-iban-options-realtime-sync';
import { useInteractionTypeOptionsRealtimeSync } from '../features/crm/use-interaction-type-options-realtime-sync';
import { useMessagesRealtimeSync } from '../features/crm/use-messages-realtime-sync';
import { usePaymentMethodOptionsRealtimeSync } from '../features/crm/use-payment-method-options-realtime-sync';
import { useProductCategoryOptionsRealtimeSync } from '../features/crm/use-product-categories-realtime-sync';
import { useSectorOptionsRealtimeSync } from '../features/crm/use-sector-options-realtime-sync';
import { useTitleOptionsRealtimeSync } from '../features/crm/use-title-options-realtime-sync';
import { useNotificationsRealtimeSync } from '../features/notifications/use-notifications-realtime-sync';
import { useModuleAccessRealtimeSync } from '../features/platform-admin/use-module-access-realtime-sync';
import { tr } from '../i18n/tr';
import { useRealtimeConnection } from '../lib/realtime';

export function ProtectedRoute({
  children,
  allowPlatformAdmin = false,
}: {
  children: ReactNode;
  /** Süperadmin sadece platform-admin alanında çalışır (bkz. CLAUDE.md §5) — tenant
   * sayfaları (dashboards, firmalar, vb.) varsayılan olarak süperadmine kapalıdır, bu
   * kontrolü açıkça isteyen route'lar (ör. /profile) `allowPlatformAdmin` geçer. */
  allowPlatformAdmin?: boolean;
}) {
  const meQuery = useMeQuery();
  const isAuthenticated = !!meQuery.data;

  useRealtimeConnection(isAuthenticated);
  useModuleAccessRealtimeSync();
  useMessagesRealtimeSync();
  useCalendarEventsRealtimeSync();
  useSectorOptionsRealtimeSync();
  useDepartmentOptionsRealtimeSync();
  useBrandOptionsRealtimeSync();
  useProductCategoryOptionsRealtimeSync();
  useTitleOptionsRealtimeSync();
  usePaymentMethodOptionsRealtimeSync();
  useIbanOptionsRealtimeSync();
  useInteractionTypeOptionsRealtimeSync();
  useNotificationsRealtimeSync();

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

  if (meQuery.data.isPlatformAdmin && !allowPlatformAdmin) {
    return <Navigate to="/platform-admin" replace />;
  }

  return <>{children}</>;
}
