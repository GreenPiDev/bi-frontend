import { useQuery } from '@tanstack/react-query';
import { getMyPageAccess } from '../../lib/api';

export function usePageAccessQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['tenants', 'me', 'page-modules'],
    queryFn: () => getMyPageAccess(),
    enabled: options.enabled,
  });
}

/**
 * Sorgu henuz donmediyse false doner - hasPermission'in (features/auth/permissions.ts)
 * veri gelene kadar erisimi kapali sayma davranisiyla tutarli (bkz. app-shell.tsx canView).
 */
export function useIsPageModuleAccessible(pageKey: string): boolean {
  const query = usePageAccessQuery();
  if (!query.data) {
    return false;
  }
  const entry = query.data.find((row) => row.pageKey === pageKey);
  return entry?.accessible ?? true;
}
