import { useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { DatasetsListContent } from './datasets-list-page';
import { SpreadsheetsListContent } from './spreadsheets-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { usePageTitle } from '../lib/document-title';
import { tr } from '../i18n/tr';

/** /datasets - Veri Kumeleri + E-Tablolar sekmeleri (/envanter ile ayni desen). */
export function DatasetsManagementPage() {
  const [searchParams] = useSearchParams();
  const permissions = useMeQuery().data?.permissions;

  // Hook'lar kosulsuz cagrilmali (Rules of Hooks).
  const datasetsModuleOk = useIsPageModuleAccessible('datasets');
  const spreadsheetsModuleOk = useIsPageModuleAccessible('spreadsheets');
  const datasetsAccessible = hasPermission(permissions, 'datasets', 'VIEW') && datasetsModuleOk;
  const spreadsheetsAccessible =
    hasPermission(permissions, 'spreadsheets', 'VIEW') && spreadsheetsModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(spreadsheetsAccessible
      ? [
          {
            key: 'spreadsheets',
            label: tr.datasets.tabs.spreadsheets,
            content: <SpreadsheetsListContent />,
          },
        ]
      : []),
    ...(datasetsAccessible
      ? [{ key: 'datasets', label: tr.datasets.tabs.datasets, content: <DatasetsListContent /> }]
      : []),
  ];

  const activeTab = tabs.find((tab) => tab.key === searchParams.get('tab')) ?? tabs[0];
  usePageTitle(activeTab ? `${activeTab.label} · ${tr.datasets.title}` : tr.datasets.title);
  const helpText = activeTab?.key === 'spreadsheets' ? tr.help.spreadsheets : tr.help.datasets;

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.datasets.title}</h1>
        <PageHelp text={helpText} />
      </div>
      <p className="text-sm text-app-muted">{tr.datasets.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.datasets.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
