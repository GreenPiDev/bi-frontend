import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformModuleDefinitions,
  getPlatformPageModules,
  getPlatformTenantModules,
  getPlatformTenants,
  setPlatformPageModule,
  setPlatformTenantModule,
  type ModuleDefinition,
  type PageModuleAssignment,
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

export function usePlatformModuleDefinitionsQuery() {
  return useQuery<ModuleDefinition[]>({
    queryKey: ['platform-admin', 'modules'],
    queryFn: getPlatformModuleDefinitions,
  });
}

export const PLATFORM_PAGE_MODULES_QUERY_KEY = ['platform-admin', 'page-modules'];

export function usePlatformPageModulesQuery() {
  return useQuery({
    queryKey: PLATFORM_PAGE_MODULES_QUERY_KEY,
    queryFn: getPlatformPageModules,
  });
}

export function useSetPlatformPageModuleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageKey, moduleKeys }: { pageKey: string; moduleKeys: string[] }) =>
      setPlatformPageModule(pageKey, moduleKeys),
    onSuccess: (assignments: PageModuleAssignment[]) => {
      queryClient.setQueryData(PLATFORM_PAGE_MODULES_QUERY_KEY, assignments);
    },
  });
}
