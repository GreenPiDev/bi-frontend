import { MultiSelect } from '../components/ui/multi-select';
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

  const moduleOptions = (moduleDefinitionsQuery.data ?? []).map((module) => ({
    value: module.key,
    label: module.label,
  }));

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-app-border bg-app-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-app-border text-xs uppercase text-app-muted">
          <tr>
            <th className="px-4 py-3">{tr.platformAdmin.pageColumn}</th>
            <th className="px-4 py-3">{tr.platformAdmin.moduleColumn}</th>
          </tr>
        </thead>
        <tbody>
          {pageModulesQuery.data?.map((assignment) => (
            <tr key={assignment.pageKey} className="border-b border-app-border last:border-0">
              <td className="px-4 py-3 font-semibold text-app-text">{assignment.label}</td>
              <td className="px-4 py-3">
                <MultiSelect
                  label={tr.platformAdmin.moduleColumn}
                  placeholder={tr.platformAdmin.noModuleOption}
                  options={moduleOptions}
                  value={assignment.moduleKeys}
                  onChange={(moduleKeys) =>
                    setPageModuleMutation.mutate({ pageKey: assignment.pageKey, moduleKeys })
                  }
                />
              </td>
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
