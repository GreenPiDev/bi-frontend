import { useQuery } from '@tanstack/react-query';
import { getMyTenantModules } from '../../lib/api';

export function useMyTenantModulesQuery() {
  return useQuery({
    queryKey: ['tenants', 'me', 'modules'],
    queryFn: () => getMyTenantModules(),
  });
}

export function useIsModuleEnabled(moduleKey: string): boolean | undefined {
  const query = useMyTenantModulesQuery();
  if (!query.data) {
    return undefined;
  }
  return query.data.some((module) => module.key === moduleKey && module.enabled);
}
