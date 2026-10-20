import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ChartCard } from '../components/ui/chart-card';
import { HorizontalTabPanel } from '../components/ui/horizontal-tab-panel';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { extractAccountId } from '../features/crm/account-slug';
import { useAccountQuery } from '../features/crm/use-accounts';
import { useInteractionsQuery } from '../features/crm/use-interactions';
import { useOpportunitiesQuery } from '../features/crm/use-opportunities';
import { useProjectsQuery } from '../features/crm/use-projects';
import { useQuoteStatusCounts, useQuotesQuery } from '../features/crm/use-quotes';
import { useSalesOrderStatusCounts, useSalesOrdersQuery } from '../features/crm/use-sales-orders';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import {
  formatCurrencyAmount,
  getQuoteCurrencyTotals,
  QUOTE_STATUS_OPTIONS,
} from '../lib/quote-totals';
import type {
  Contact,
  Interaction,
  Opportunity,
  Project,
  Quote,
  QuoteStatus,
  SalesOrder,
  SalesOrderStatus,
} from '../lib/api';
import { tr } from '../i18n/tr';

const SALES_ORDER_STATUS_OPTIONS: { value: SalesOrderStatus; label: string }[] = (
  [
    'PENDING',
    'PROCESSING',
    'READY_FOR_SHIPMENT',
    'SHIPPED',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
  ] as const
).map((status) => ({ value: status, label: tr.crm.salesOrders.statusOptions[status] }));

const CRITICAL_FIELD_LABELS: Record<string, string> = tr.crm.accounts.criticalFieldLabels;

const QUOTE_STATUS_BADGE_VARIANT: Record<
  string,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange' | 'info'
> = {
  DRAFT: 'neutral',
  SENT: 'info',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIZE: 'orange',
};

const INTERACTION_STATUS_BADGE_VARIANT: Record<string, 'success' | 'neutral'> = {
  OPEN: 'success',
  CLOSED: 'neutral',
};

const SALES_ORDER_STATUS_BADGE_VARIANT: Record<
  string,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange' | 'info'
> = {
  PENDING: 'neutral',
  PROCESSING: 'info',
  READY_FOR_SHIPMENT: 'info',
  SHIPPED: 'info',
  PARTIALLY_DELIVERED: 'warning',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

function formatBudget(value: string | null): string {
  if (!value) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
    Number(value),
  );
}

function quoteTotalsByCurrency(quote: Quote) {
  return getQuoteCurrencyTotals(quote);
}

const numberFormatter = new Intl.NumberFormat('tr-TR');

function StatCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1 border border-app-border bg-app-surface p-6 text-center transition-colors hover:border-app-brand hover:bg-app-bg-muted"
    >
      <span className="text-3xl font-bold text-app-text">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </button>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-bold tracking-wide text-app-muted uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

const INTERACTION_COLUMNS: TableColumn<Interaction>[] = [
  {
    key: 'occurredAt',
    header: tr.crm.interactions.dateColumn,
    className: 'text-app-muted',
    render: (i) => new Date(i.occurredAt).toLocaleDateString('tr-TR'),
  },
  {
    key: 'contact',
    header: tr.crm.interactions.contactColumn,
    render: (i) => (i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : '—'),
  },
  {
    key: 'type',
    header: tr.crm.interactions.typeColumn,
    render: (i) => i.type,
  },
  {
    key: 'status',
    header: tr.crm.interactions.statusColumn,
    render: (i) => (
      <Badge variant={INTERACTION_STATUS_BADGE_VARIANT[i.status]}>
        {tr.crm.interactions.statusOptions[i.status]}
      </Badge>
    ),
  },
];

const OPPORTUNITY_COLUMNS: TableColumn<Opportunity>[] = [
  {
    key: 'name',
    header: tr.crm.opportunities.nameColumn,
    render: (o) => <span className="font-semibold text-app-text">{o.name}</span>,
  },
  {
    key: 'stage',
    header: tr.crm.opportunities.stageColumn,
    render: (o) => tr.crm.opportunities.stageOptions[o.stage],
  },
  {
    key: 'estimatedValue',
    header: tr.crm.opportunities.valueColumn,
    className: 'text-app-muted',
    render: (o) =>
      o.estimatedValue
        ? new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: o.estimatedValueCurrency,
          }).format(Number(o.estimatedValue))
        : '—',
  },
];

const QUOTE_COLUMNS: TableColumn<Quote>[] = [
  {
    key: 'quoteNumber',
    header: tr.crm.quotes.numberColumn,
    render: (q) => <span className="font-semibold text-app-text">{q.quoteNumber}</span>,
  },
  {
    key: 'status',
    header: tr.crm.quotes.statusColumn,
    render: (q) => (
      <Badge variant={QUOTE_STATUS_BADGE_VARIANT[q.status]}>
        {tr.crm.quotes.statusOptions[q.status]}
      </Badge>
    ),
  },
  {
    key: 'total',
    header: tr.crm.quotes.totalColumn,
    className: 'text-app-muted',
    render: (q) => (
      <div className="flex flex-col">
        {quoteTotalsByCurrency(q).map((t) => (
          <span key={t.currency}>{formatCurrencyAmount(t.grandTotal, t.currency)}</span>
        ))}
      </div>
    ),
  },
];

const SALES_ORDER_COLUMNS: TableColumn<SalesOrder>[] = [
  {
    key: 'orderNumber',
    header: tr.crm.salesOrders.numberColumn,
    render: (o) => <span className="font-semibold text-app-text">{o.orderNumber}</span>,
  },
  {
    key: 'quote',
    header: tr.crm.salesOrders.quoteColumn,
    className: 'text-app-muted',
    render: (o) => o.quote?.quoteNumber ?? '—',
  },
  {
    key: 'status',
    header: tr.crm.salesOrders.statusColumn,
    render: (o) => (
      <Badge variant={SALES_ORDER_STATUS_BADGE_VARIANT[o.status]}>
        {tr.crm.salesOrders.statusOptions[o.status]}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: tr.crm.salesOrders.createdAtColumn,
    className: 'text-app-muted',
    render: (o) => new Date(o.createdAt).toLocaleDateString('tr-TR'),
  },
];

const CONTACT_COLUMNS: TableColumn<Contact>[] = [
  {
    key: 'name',
    header: tr.crm.contacts.nameColumn,
    render: (c) => (
      <span className="font-semibold text-app-text">
        {c.firstName} {c.lastName}
      </span>
    ),
  },
  {
    key: 'department',
    header: tr.crm.contacts.departmentColumn,
    className: 'text-app-muted',
    render: (c) => c.department ?? '—',
  },
  {
    key: 'phone',
    header: tr.crm.contacts.phoneColumn,
    className: 'text-app-muted',
    render: (c) => c.phone ?? '—',
  },
  {
    key: 'email',
    header: tr.crm.contacts.emailColumn,
    className: 'text-app-muted',
    render: (c) => c.email ?? '—',
  },
];

const PROJECT_COLUMNS: TableColumn<Project>[] = [
  {
    key: 'projectNumber',
    header: tr.crm.projects.numberColumn,
    className: 'font-semibold text-app-text',
    render: (p) => p.projectNumber,
  },
  {
    key: 'name',
    header: tr.crm.projects.nameColumn,
    render: (p) => p.name,
  },
  {
    key: 'estimatedBudget',
    header: tr.crm.projects.estimatedBudgetColumn,
    className: 'text-app-muted',
    render: (p) => formatBudget(p.estimatedBudget),
  },
];

/** Firma detayi "Teklifler" sekmesinde, teklif listesinin ustunde gosterilen durum
 * dagilim grafigi - /settings/kullanicilar/:slug'daki QuoteChartsSection ile ayni
 * desen, ama tenant/kullanici yerine bu firmaya (`accountId`) daraltilmis. Dilime
 * tiklaninca /teklifler?tab=quotes sayfasina bu firmaya ve tiklanan duruma
 * filtrelenmis sekilde gider (bkz. quotes-list-page.tsx'teki URL destegi). */
function AccountQuoteStatusChart({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const theme = getChartTheme();
  const statusCounts = useQuoteStatusCounts(
    QUOTE_STATUS_OPTIONS.map((option) => option.value),
    { accountId },
  );

  function goToAccountQuotes(status?: QuoteStatus) {
    const params = new URLSearchParams({ tab: 'quotes', accountId });
    if (status) params.set('status', status);
    navigate(`/teklifler?${params.toString()}`);
  }

  const statusDistributionPoints = QUOTE_STATUS_OPTIONS.map((option) => ({
    status: option.value,
    name: option.label,
    value: statusCounts.counts[option.value] ?? 0,
  })).filter((point) => point.value > 0);
  const hasQuotes = statusDistributionPoints.length > 0;
  const statusDistributionOption = buildPieOptionFromPoints(
    theme,
    statusDistributionPoints,
    (value) => numberFormatter.format(value),
  );

  if (!hasQuotes) return null;

  return (
    <ChartCard title={tr.crm.quoteReports.statusDistributionTitle} className="mb-4">
      <ChartWithExport
        option={statusDistributionOption}
        fileName={tr.crm.quoteReports.statusDistributionTitle}
        onEvents={{
          click: (params) => goToAccountQuotes(statusDistributionPoints[params.dataIndex]?.status),
        }}
      />
    </ChartCard>
  );
}

/** Firma detayi "Satış Siparişleri" sekmesinde, siparis listesinin ustunde gosterilen
 * durum dagilim grafigi - AccountQuoteStatusChart ile ayni desen. Dilime tiklaninca
 * /siparisler?tab=salesOrders sayfasina bu firmaya ve tiklanan duruma filtrelenmis
 * sekilde gider (bkz. sales-order-list-page.tsx'teki URL destegi). */
function AccountSalesOrderStatusChart({ accountId }: { accountId: string }) {
  const navigate = useNavigate();
  const theme = getChartTheme();
  const statusCounts = useSalesOrderStatusCounts(
    SALES_ORDER_STATUS_OPTIONS.map((option) => option.value),
    { accountId },
  );

  function goToAccountSalesOrders(status?: SalesOrderStatus) {
    const params = new URLSearchParams({ tab: 'salesOrders', accountId });
    if (status) params.set('status', status);
    navigate(`/siparisler?${params.toString()}`);
  }

  const statusDistributionPoints = SALES_ORDER_STATUS_OPTIONS.map((option) => ({
    status: option.value,
    name: option.label,
    value: statusCounts.counts[option.value] ?? 0,
  })).filter((point) => point.value > 0);
  const hasSalesOrders = statusDistributionPoints.length > 0;
  const statusDistributionOption = buildPieOptionFromPoints(
    theme,
    statusDistributionPoints,
    (value) => numberFormatter.format(value),
  );

  if (!hasSalesOrders) return null;

  return (
    <ChartCard title={tr.crm.salesOrders.statusDistributionTitle} className="mb-4">
      <ChartWithExport
        option={statusDistributionOption}
        fileName={tr.crm.salesOrders.statusDistributionTitle}
        onEvents={{
          click: (params) =>
            goToAccountSalesOrders(statusDistributionPoints[params.dataIndex]?.status),
        }}
      />
    </ChartCard>
  );
}

export function AccountDetailPage() {
  const { slug = '' } = useParams();
  const id = extractAccountId(slug);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountQuery = useAccountQuery(id);
  const interactionsQuery = useInteractionsQuery({ accountId: id });
  const opportunitiesQuery = useOpportunitiesQuery({ accountId: id });
  const quotesQuery = useQuotesQuery({ accountId: id });
  const projectsQuery = useProjectsQuery({ accountId: id });
  const salesOrdersQuery = useSalesOrdersQuery({ accountId: id });

  function goToTab(tabKey: string) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabKey);
    setSearchParams(next);
  }

  if (accountQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  if (!accountQuery.data) {
    return null;
  }

  const account = accountQuery.data;

  const fields: { label: string; value: string }[] = [
    { label: tr.crm.accounts.form.taxNumberLabel, value: account.taxNumber ?? '—' },
    { label: tr.crm.accounts.form.taxOfficeLabel, value: account.taxOffice ?? '—' },
    {
      label: tr.crm.accounts.form.sectorLabel,
      value: (account.sector?.length ?? 0) > 0 ? account.sector.join(', ') : '—',
    },
    { label: tr.crm.accounts.form.websiteLabel, value: account.website ?? '—' },
    { label: tr.crm.accounts.form.phoneLabel, value: account.phone ?? '—' },
    { label: tr.crm.accounts.form.landlinePhoneLabel, value: account.landlinePhone ?? '—' },
    { label: tr.crm.accounts.form.emailLabel, value: account.email ?? '—' },
    { label: tr.crm.accounts.form.addressLabel, value: account.address ?? '—' },
    { label: tr.crm.accounts.form.cityLabel, value: account.city ?? '—' },
    { label: tr.crm.accounts.form.districtLabel, value: account.district ?? '—' },
  ];

  return (
    <AppShell>
      <BackLink to={'/firmalar'} label={tr.crm.accounts.detail.back} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{account.name}</h1>
            <PageHelp text={tr.help.accountDetail} />
            {account.accountTypes.map((type) => (
              <Badge key={type} variant="info">
                {tr.crm.accounts.accountTypeOptions[type]}
              </Badge>
            ))}
          </div>
          {account.missingCriticalFields.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} className="shrink-0" />
              {tr.crm.accounts.missingFieldsWarning(
                account.missingCriticalFields
                  .map((field) => CRITICAL_FIELD_LABELS[field] ?? field)
                  .join(', '),
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <HorizontalTabPanel
          queryParam="tab"
          tabs={[
            {
              key: 'general',
              label: tr.crm.accounts.detail.tabGeneral,
              content: (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      label={tr.crm.accounts.detail.tabInteractions}
                      value={interactionsQuery.data?.meta.total}
                      onClick={() => goToTab('interactions')}
                    />
                    <StatCard
                      label={tr.crm.accounts.detail.tabOpportunities}
                      value={opportunitiesQuery.data?.meta.total}
                      onClick={() => goToTab('opportunities')}
                    />
                    <StatCard
                      label={tr.crm.accounts.detail.tabQuotes}
                      value={quotesQuery.data?.meta.total}
                      onClick={() => goToTab('quotes')}
                    />
                    <StatCard
                      label={tr.crm.accounts.detail.tabProjects}
                      value={projectsQuery.data?.meta.total}
                      onClick={() => goToTab('projects')}
                    />
                  </div>

                  <div className="rounded-xl border border-app-border bg-white p-5">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {fields.map((field) => (
                        <div key={field.label}>
                          <dt className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
                            {field.label}
                          </dt>
                          <dd className="mt-1.5 text-sm font-medium text-app-text">
                            {field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-xl border border-app-border bg-white p-5">
                    <SectionHeader>{tr.crm.accounts.detail.contactsTitle}</SectionHeader>
                    <Table<Contact>
                      columns={CONTACT_COLUMNS}
                      data={account.contacts}
                      keyField={(contact) => contact.id}
                      onRowClick={(contact) => navigate(`/kisiler/${contact.id}`)}
                      getRowHref={(contact) => `/kisiler/${contact.id}`}
                      emptyMessage={tr.crm.accounts.detail.noContacts}
                    />
                  </div>

                  <div className="rounded-xl border border-app-border bg-white p-5">
                    <SectionHeader>{tr.crm.accounts.detail.customFieldsTitle}</SectionHeader>
                    {account.customFields && Object.keys(account.customFields).length > 0 ? (
                      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(account.customFields).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-[11px] font-semibold tracking-wide text-app-muted uppercase">
                              {key}
                            </dt>
                            <dd className="mt-1.5 text-sm font-medium text-app-text">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-app-muted">
                        {tr.crm.accounts.detail.customFieldsEmpty}
                      </p>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'interactions',
              label: tr.crm.accounts.detail.tabInteractions,
              content: (
                <div>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/gorusmeler/yeni?accountId=${id}`)}
                    >
                      {tr.crm.interactions.newButton}
                    </Button>
                  </div>
                  <Table<Interaction>
                    columns={INTERACTION_COLUMNS}
                    data={interactionsQuery.data?.data ?? []}
                    keyField={(interaction) => interaction.id}
                    onRowClick={(interaction) => navigate(`/gorusmeler/${interaction.id}`)}
                    getRowHref={(interaction) => `/gorusmeler/${interaction.id}`}
                    isLoading={interactionsQuery.isPending}
                    emptyMessage={tr.crm.accounts.detail.noInteractions}
                  />
                </div>
              ),
            },
            {
              key: 'opportunities',
              label: tr.crm.accounts.detail.tabOpportunities,
              content: (
                <div>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/firsatlar/yeni?accountId=${id}`)}
                    >
                      {tr.crm.opportunities.newButton}
                    </Button>
                  </div>
                  <Table<Opportunity>
                    columns={OPPORTUNITY_COLUMNS}
                    data={opportunitiesQuery.data?.data ?? []}
                    keyField={(opportunity) => opportunity.id}
                    onRowClick={(opportunity) => navigate(`/firsatlar/${opportunity.id}`)}
                    getRowHref={(opportunity) => `/firsatlar/${opportunity.id}`}
                    isLoading={opportunitiesQuery.isPending}
                    emptyMessage={tr.crm.accounts.detail.noOpportunities}
                  />
                </div>
              ),
            },
            {
              key: 'quotes',
              label: tr.crm.accounts.detail.tabQuotes,
              content: (
                <div>
                  <AccountQuoteStatusChart accountId={id} />
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/teklifler/yeni?accountId=${id}`)}
                    >
                      {tr.crm.quotes.newButton}
                    </Button>
                  </div>
                  <Table<Quote>
                    columns={QUOTE_COLUMNS}
                    data={quotesQuery.data?.data ?? []}
                    keyField={(quote) => quote.id}
                    onRowClick={(quote) => navigate(`/teklifler/${quote.id}`)}
                    getRowHref={(quote) => `/teklifler/${quote.id}`}
                    isLoading={quotesQuery.isPending}
                    emptyMessage={tr.crm.accounts.detail.noQuotes}
                  />
                </div>
              ),
            },
            {
              key: 'projects',
              label: tr.crm.accounts.detail.tabProjects,
              content: (
                <div>
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/projeler/yeni?accountId=${id}`)}
                    >
                      {tr.crm.projects.newButton}
                    </Button>
                  </div>
                  <Table<Project>
                    columns={PROJECT_COLUMNS}
                    data={projectsQuery.data?.data ?? []}
                    keyField={(project) => project.id}
                    onRowClick={(project) => navigate(`/projeler/${project.projectNumber}`)}
                    getRowHref={(project) => `/projeler/${project.projectNumber}`}
                    isLoading={projectsQuery.isPending}
                    emptyMessage={tr.crm.accounts.detail.noProjects}
                  />
                </div>
              ),
            },
            {
              key: 'salesOrders',
              label: tr.crm.accounts.detail.tabSalesOrders,
              content: (
                <div>
                  <AccountSalesOrderStatusChart accountId={id} />
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/satis-siparisleri/yeni?accountId=${id}`)}
                    >
                      {tr.crm.salesOrders.newButton}
                    </Button>
                  </div>
                  <Table<SalesOrder>
                    columns={SALES_ORDER_COLUMNS}
                    data={salesOrdersQuery.data?.data ?? []}
                    keyField={(order) => order.id}
                    onRowClick={(order) => navigate(`/satis-siparisleri/${order.id}`)}
                    getRowHref={(order) => `/satis-siparisleri/${order.id}`}
                    isLoading={salesOrdersQuery.isPending}
                    emptyMessage={tr.crm.accounts.detail.noSalesOrders}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
