import { MultiSelect } from '../components/ui/multi-select';
import {
  usePlatformTenantModulesQuery,
  useSetPlatformTenantModuleMutation,
} from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';

export function PlatformAdminTenantModules({ tenantId }: { tenantId: string }) {
  const modulesQuery = usePlatformTenantModulesQuery(tenantId);
  const toggleMutation = useSetPlatformTenantModuleMutation(tenantId);

  if (modulesQuery.isPending) {
    return <p className="text-sm text-app-muted">{tr.common.loading}</p>;
  }

  const modules = modulesQuery.data ?? [];
  const enabledKeys = modules.filter((module) => module.enabled).map((module) => module.key);
  const options = modules.map((module) => ({
    value: module.key,
    label: module.alwaysOn ? `${module.label} (${tr.platformAdmin.alwaysOnBadge})` : module.label,
    disabled: module.alwaysOn || toggleMutation.isPending,
  }));

  // MultiSelect reports the full new selection; the API toggles one module at a time, so
  // diff against the current state to find the single module that changed.
  function handleChange(nextKeys: string[]) {
    const changed = modules.find(
      (module) => nextKeys.includes(module.key) !== enabledKeys.includes(module.key),
    );
    if (!changed || changed.alwaysOn) return;
    toggleMutation.mutate({ moduleKey: changed.key, enabled: !changed.enabled });
  }

  return (
    // Fixed width so the button truncates selected labels instead of widening the column.
    <div className="w-44">
      <MultiSelect
        value={enabledKeys}
        onChange={handleChange}
        options={options}
        placeholder={tr.platformAdmin.modulesPlaceholder}
        error={toggleMutation.isError ? tr.platformAdmin.updateError : undefined}
      />
    </div>
  );
}
