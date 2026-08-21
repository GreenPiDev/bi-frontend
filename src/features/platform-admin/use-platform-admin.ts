import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformTenantModules,
  getPlatformTenants,
  setPlatformTenantModule,
  type TenantModuleStatus,
} from '../../lib/api';

export const PLATFORM_TENANTS_QUERY_KEY = ['platform-admin', 'tenants'];

export function usePlatformTenantsQuery() {
  return useQuery({
    queryKey: PLATFORM_TENANTS_QUERY_KEY,
    queryFn: getPlatformTenants,
  });
}

export function platformTenantModulesQueryKey(tenantId: string) {
  return ['platform-admin', 'tenants', tenantId, 'modules'];
}

export function usePlatformTenantModulesQuery(tenantId: string) {
  return useQuery({
    queryKey: platformTenantModulesQueryKey(tenantId),
    queryFn: () => getPlatformTenantModules(tenantId),
  });
}

export function useSetPlatformTenantModuleMutation(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) =>
      setPlatformTenantModule(tenantId, moduleKey, enabled),
    onSuccess: (modules: TenantModuleStatus[]) => {
      queryClient.setQueryData(platformTenantModulesQueryKey(tenantId), modules);
    },
  });
}
