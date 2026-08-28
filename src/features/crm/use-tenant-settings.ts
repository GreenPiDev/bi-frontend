import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listTenantSettings, updateTenantSetting } from '../../lib/api';

const TENANT_SETTINGS_QUERY_KEY = ['tenant-settings'];

export function useTenantSettingsQuery() {
  return useQuery({
    queryKey: TENANT_SETTINGS_QUERY_KEY,
    queryFn: () => listTenantSettings(),
  });
}

export function useUpdateTenantSettingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateTenantSetting(key, value),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TENANT_SETTINGS_QUERY_KEY }),
  });
}
