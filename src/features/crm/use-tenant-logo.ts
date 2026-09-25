import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteTenantLogo, getMyTenant, uploadTenantLogo } from '../../lib/api';

const TENANT_PROFILE_QUERY_KEY = ['tenants', 'me'];

export function useTenantProfileQuery(enabled = true) {
  return useQuery({
    queryKey: TENANT_PROFILE_QUERY_KEY,
    queryFn: () => getMyTenant(),
    enabled,
  });
}

export function useUploadTenantLogoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadTenantLogo(file),
    onSuccess: (profile) => queryClient.setQueryData(TENANT_PROFILE_QUERY_KEY, profile),
  });
}

export function useDeleteTenantLogoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteTenantLogo(),
    onSuccess: (profile) => queryClient.setQueryData(TENANT_PROFILE_QUERY_KEY, profile),
  });
}
