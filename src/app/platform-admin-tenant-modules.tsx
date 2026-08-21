import { clsx } from 'clsx';
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

  return (
    <div className="flex flex-wrap gap-2">
      {modulesQuery.data?.map((module) => (
        <button
          key={module.key}
          type="button"
          disabled={module.alwaysOn || toggleMutation.isPending}
          onClick={() => toggleMutation.mutate({ moduleKey: module.key, enabled: !module.enabled })}
          className={clsx(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed',
            module.enabled
              ? 'border-app-brand bg-app-brand/10 text-app-brand'
              : 'border-app-border bg-app-bg text-app-muted',
          )}
        >
          {module.label}
          {module.alwaysOn ? ` (${tr.platformAdmin.alwaysOnBadge})` : null}
        </button>
      ))}
      {toggleMutation.isError && (
        <p className="w-full text-xs text-app-danger">{tr.platformAdmin.updateError}</p>
      )}
    </div>
  );
}
