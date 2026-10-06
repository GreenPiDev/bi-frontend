import { AppShell } from './app-shell';
import { QuoteReportsContent } from './quote-reports-content';
import { QuoteTemplateListContent } from './quote-template-list-page';
import { QuotesListContent } from './quotes-list-page';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { hasPermission } from '../features/auth/permissions';
import { useMeQuery } from '../features/auth/use-auth';
import { useIsPageModuleAccessible } from '../features/crm/use-page-access';
import { tr } from '../i18n/tr';

export function QuoteManagementPage() {
  const meQuery = useMeQuery();
  const permissions = meQuery.data?.permissions;
  const canView = (pageKey: string) => hasPermission(permissions, pageKey, 'VIEW');

  const quotesModuleOk = useIsPageModuleAccessible('quotes');
  const templatesModuleOk = useIsPageModuleAccessible('quote-templates');

  const quotesAccessible = canView('quotes') && quotesModuleOk;
  const templatesAccessible = canView('quote-templates') && templatesModuleOk;

  const tabs: HorizontalTabItem[] = [
    ...(quotesAccessible
      ? [{ key: 'quotes', label: tr.quoteManagement.tabs.quotes, content: <QuotesListContent /> }]
      : []),
    ...(quotesAccessible
      ? [
          {
            key: 'reports',
            label: tr.quoteManagement.tabs.reports,
            content: <QuoteReportsContent />,
          },
        ]
      : []),
    ...(templatesAccessible
      ? [
          {
            key: 'templates',
            label: tr.quoteManagement.tabs.templates,
            content: <QuoteTemplateListContent />,
          },
        ]
      : []),
  ];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.quoteManagement.title}</h1>
        <PageHelp text={tr.help.quoteManagement} />
      </div>
      <p className="text-sm text-app-muted">{tr.quoteManagement.subtitle}</p>

      <div className="mt-6">
        {tabs.length > 0 ? (
          <HorizontalTabPanel tabs={tabs} queryParam="tab" />
        ) : (
          <p className="mt-4 text-sm text-app-muted">{tr.quoteManagement.noAccess}</p>
        )}
      </div>
    </AppShell>
  );
}
