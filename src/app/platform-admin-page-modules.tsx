import { Switch } from '../components/ui/switch';
import type { PageModuleAssignment } from '../lib/api';
import {
  usePlatformModuleDefinitionsQuery,
  usePlatformPageModulesQuery,
  useSetPlatformPageModuleMutation,
} from '../features/platform-admin/use-platform-admin';
import { tr } from '../i18n/tr';

export function PlatformAdminPageModules() {
  const pageModulesQuery = usePlatformPageModulesQuery();
  const moduleDefinitionsQuery = usePlatformModuleDefinitionsQuery();
  const setPageModuleMutation = useSetPlatformPageModuleMutation();

  if (pageModulesQuery.isPending || moduleDefinitionsQuery.isPending) {
    return <p className="text-sm text-app-muted">{tr.platformAdmin.pageModulesLoading}</p>;
  }

  const modules = moduleDefinitionsQuery.data ?? [];

  function toggleModule(assignment: PageModuleAssignment, moduleKey: string) {
    const moduleKeys = assignment.moduleKeys.includes(moduleKey)
      ? assignment.moduleKeys.filter((key) => key !== moduleKey)
      : [...assignment.moduleKeys, moduleKey];
    setPageModuleMutation.mutate({ pageKey: assignment.pageKey, moduleKeys });
  }

  return (
    <div className="mt-6 overflow-auto rounded-xl border border-app-border bg-app-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-app-border text-xs uppercase text-app-muted">
          <tr>
            <th className="px-4 py-3">{tr.platformAdmin.pageColumn}</th>
            {modules.map((module) => (
              <th
                key={module.key}
                className="border-l border-app-border px-4 py-3 text-center normal-case text-app-text"
              >
                {module.label}
                {module.alwaysOn && (
                  <span className="ml-1 text-[10px] font-normal normal-case text-app-muted">
                    ({tr.platformAdmin.alwaysOnBadge})
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageModulesQuery.data?.map((assignment) => (
            <tr key={assignment.pageKey} className="border-b border-app-border last:border-0">
              <td className="px-4 py-3 font-semibold text-app-text">{assignment.label}</td>
              {modules.map((module) => (
                <td key={module.key} className="border-l border-app-border px-4 py-3 text-center">
                  <Switch
                    checked={assignment.moduleKeys.includes(module.key)}
                    onChange={() => toggleModule(assignment, module.key)}
                    label={`${assignment.label} - ${module.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {setPageModuleMutation.isError && (
        <p className="px-4 py-3 text-xs text-app-danger">
          {tr.platformAdmin.pageModuleUpdateError}
        </p>
      )}
    </div>
  );
}
