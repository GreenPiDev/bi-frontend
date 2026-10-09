import { useMutation } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { QuoteReportsContent } from './quote-reports-content';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { HorizontalTabPanel, type HorizontalTabItem } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { useTenantProfileQuery } from '../features/crm/use-tenant-logo';
import { ApiError, exportReportsPdf } from '../lib/api';
import { loadBlobIntoTabHandle, openBlobInNewTabHandle } from '../lib/download';
import { tr } from '../i18n/tr';

const TAB_KEYS = [
  'accounts',
  'contacts',
  'interactions',
  'projects',
  'quotes',
  'purchaseOrders',
  'opportunities',
] as const;

type ReportTabKey = (typeof TAB_KEYS)[number];

function ComingSoonContent() {
  return (
    <div className="rounded-xl border border-dashed border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
      {tr.reports.comingSoon}
    </div>
  );
}

function reportTabBody(tabKey: ReportTabKey, isPrintMode: boolean) {
  if (tabKey === 'quotes') return <QuoteReportsContent isPrintMode={isPrintMode} />;
  return <ComingSoonContent />;
}

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const isPrintMode = searchParams.get('print') === '1';
  const activeTab = (searchParams.get('tab') as ReportTabKey | null) ?? 'accounts';
  const tenantProfileQuery = useTenantProfileQuery();

  const exportPdfMutation = useMutation({
    mutationFn: (tabKey: ReportTabKey) => exportReportsPdf(tabKey),
    onMutate: () => ({ tabHandle: openBlobInNewTabHandle() }),
    onSuccess: (blob, _tabKey, context) => loadBlobIntoTabHandle(context.tabHandle, blob),
  });

  if (isPrintMode) {
    return (
      <AppShell print printLogoUrl={tenantProfileQuery.data?.logoUrl}>
        {reportTabBody(TAB_KEYS.includes(activeTab) ? activeTab : 'accounts', true)}
      </AppShell>
    );
  }

  const tabs: HorizontalTabItem[] = TAB_KEYS.map((key) => ({
    key,
    label: tr.reports.tabs[key],
    content: (
      <>
        <div className="mt-4 flex items-center justify-end gap-2">
          <CircleIconButton
            icon={FileDown}
            tooltip={tr.reports.exportPdfButton}
            onClick={() => exportPdfMutation.mutate(key)}
            disabled={exportPdfMutation.isPending}
          />
        </div>
        {exportPdfMutation.error && exportPdfMutation.variables === key && (
          <p className="mt-2 text-right text-sm text-app-danger">
            {exportPdfMutation.error instanceof ApiError
              ? exportPdfMutation.error.message
              : tr.reports.exportPdfError}
          </p>
        )}
        <div className="mt-4">{reportTabBody(key, false)}</div>
      </>
    ),
  }));

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">{tr.reports.title}</h1>
        <PageHelp text={tr.help.reports} />
      </div>
      <p className="text-sm text-app-muted">{tr.reports.subtitle}</p>

      <div className="mt-6">
        <HorizontalTabPanel tabs={tabs} queryParam="tab" defaultTabKey="accounts" />
      </div>
    </AppShell>
  );
}
