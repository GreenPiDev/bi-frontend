import { clsx } from 'clsx';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { NewMessageModal } from './new-message-modal';
import { buildAccountSlug } from '../features/crm/account-slug';
import { BackLink } from '../components/ui/back-link';
import { Badge } from '../components/ui/badge';
import { ChartCard } from '../components/ui/chart-card';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { PageHelp } from '../components/ui/page-help';
import { Table, type TableColumn } from '../components/ui/table';
import { useInteractionStatusCounts } from '../features/crm/use-interactions';
import {
  useQuoteRejectionReasonsSummaryQuery,
  useQuoteStatusCounts,
} from '../features/crm/use-quotes';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import { useUserStatsEntityQuery, useUserStatsQuery } from '../features/roles/use-users';
import { extractUserId } from '../features/roles/user-slug';
import { tr } from '../i18n/tr';
import { QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';
import type {
  InteractionStatus,
  QuoteStatus,
  UserStats,
  UserStatsAccountRow,
  UserStatsContactRow,
  UserStatsEntityKind,
  UserStatsInteractionRow,
  UserStatsOpportunityRow,
  UserStatsProjectRow,
  UserStatsPurchaseOrderRow,
  UserStatsQuoteRow,
  UserStatsSalesOrderRow,
} from '../lib/api';

const INTERACTION_STATUS_OPTIONS: { value: InteractionStatus; label: string }[] = [
  { value: 'OPEN', label: tr.crm.interactions.statusOptions.OPEN },
  { value: 'CLOSED', label: tr.crm.interactions.statusOptions.CLOSED },
];

const numberFormatter = new Intl.NumberFormat('tr-TR');

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR');
}

function StatCard({
  label,
  value,
  isSelected,
  onClick,
}: {
  label: string;
  value: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        'flex cursor-pointer flex-col gap-1 border p-6 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md',
        isSelected ? 'border-app-primary bg-app-primary/10' : 'border-app-border bg-app-surface',
      )}
    >
      <span className="text-3xl font-bold text-app-text">{numberFormatter.format(value)}</span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </div>
  );
}

/** Facebook/Twitter profili benzeri, salt-okunur kullanici istatistik sayfasi -
 * /settings?tab=users tablosundaki bir satira tiklayinca acilir (bkz. users-section.tsx). */
const RESPONSIBLE_PROJECT_COLUMNS: TableColumn<UserStats['responsibleProjects'][number]>[] = [
  {
    key: 'projectNumber',
    header: tr.crm.projects.numberColumn,
    render: (p) => <span className="font-semibold text-app-text">{p.projectNumber}</span>,
  },
  {
    key: 'name',
    header: tr.crm.projects.nameColumn,
    render: (p) => p.name,
  },
];

const strings = tr.settings.roles.users.statsPage;

/** Her KPI karti icin: hangi kolonlari gosterecegi, bir satira tiklayinca nereye gidecegi -
 * ilgili /firmalar, /kisiler vb. liste sayfasindaki ayni kolon/navigasyon deseni (bkz. CLAUDE.md
 * §9.1, sidebar'daki sayfalarla ayni entity'ler). */
function useEntityTableConfig(navigate: ReturnType<typeof useNavigate>) {
  const accountColumns: TableColumn<UserStatsAccountRow>[] = [
    {
      key: 'name',
      header: tr.crm.accounts.nameColumn,
      render: (a) => <span className="font-semibold text-app-text">{a.name}</span>,
    },
    {
      key: 'sector',
      header: tr.crm.accounts.sectorColumn,
      className: 'text-app-muted',
      render: (a) => (a.sector.length > 0 ? a.sector.join(', ') : '—'),
    },
    {
      key: 'phone',
      header: tr.crm.accounts.phoneColumn,
      className: 'text-app-muted',
      render: (a) => a.phone ?? '—',
    },
    {
      key: 'email',
      header: tr.crm.accounts.emailColumn,
      className: 'text-app-muted',
      render: (a) => a.email ?? '—',
    },
  ];

  const contactColumns: TableColumn<UserStatsContactRow>[] = [
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
      key: 'account',
      header: tr.crm.contacts.accountColumn,
      className: 'text-app-muted',
      render: (c) => c.account?.name ?? strings.noAccount,
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

  const interactionColumns: TableColumn<UserStatsInteractionRow>[] = [
    {
      key: 'occurredAt',
      header: tr.crm.interactions.dateColumn,
      className: 'text-app-muted',
      render: (i) => formatDate(i.occurredAt),
    },
    {
      key: 'account',
      header: tr.crm.interactions.accountColumn,
      render: (i) => (
        <span className="font-semibold text-app-text">{i.account ? i.account.name : '—'}</span>
      ),
    },
    {
      key: 'contact',
      header: tr.crm.interactions.contactColumn,
      className: 'text-app-muted',
      render: (i) =>
        i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : strings.noContact,
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
        <Badge variant={i.status === 'OPEN' ? 'info' : 'neutral'}>
          {tr.crm.interactions.statusOptions[
            i.status as keyof typeof tr.crm.interactions.statusOptions
          ] ?? i.status}
        </Badge>
      ),
    },
  ];

  const opportunityColumns: TableColumn<UserStatsOpportunityRow>[] = [
    {
      key: 'name',
      header: tr.crm.opportunities.nameColumn,
      render: (o) => <span className="font-semibold text-app-text">{o.name}</span>,
    },
    {
      key: 'stage',
      header: tr.crm.opportunities.stageColumn,
      render: (o) => (
        <Badge variant="info">
          {tr.crm.opportunities.stageOptions[
            o.stage as keyof typeof tr.crm.opportunities.stageOptions
          ] ?? o.stage}
        </Badge>
      ),
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
    {
      key: 'occurredAt',
      header: tr.crm.opportunities.occurredAtColumn,
      className: 'text-app-muted',
      render: (o) => formatDate(o.occurredAt),
    },
  ];

  const quoteColumns: TableColumn<UserStatsQuoteRow>[] = [
    {
      key: 'quoteNumber',
      header: tr.crm.quotes.numberColumn,
      render: (q) => <span className="font-semibold text-app-text">{q.quoteNumber}</span>,
    },
    {
      key: 'account',
      header: tr.crm.quotes.accountColumn,
      render: (q) => q.account.name,
    },
    {
      key: 'quoteDate',
      header: tr.crm.quotes.quoteDateColumn,
      className: 'text-app-muted',
      render: (q) => formatDate(q.quoteDate),
    },
    {
      key: 'status',
      header: tr.crm.quotes.statusColumn,
      render: (q) => (
        <Badge variant="info">
          {tr.crm.quotes.statusOptions[q.status as keyof typeof tr.crm.quotes.statusOptions] ??
            q.status}
        </Badge>
      ),
    },
  ];

  const projectColumns: TableColumn<UserStatsProjectRow>[] = [
    {
      key: 'projectNumber',
      header: tr.crm.projects.numberColumn,
      render: (p) => <span className="font-semibold text-app-text">{p.projectNumber}</span>,
    },
    {
      key: 'name',
      header: tr.crm.projects.nameColumn,
      render: (p) => p.name,
    },
    {
      key: 'account',
      header: tr.crm.projects.accountColumn,
      className: 'text-app-muted',
      render: (p) => p.account.name,
    },
    {
      key: 'estimatedBudget',
      header: tr.crm.projects.estimatedBudgetColumn,
      className: 'text-app-muted',
      render: (p) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
          Number(p.estimatedBudget),
        ),
    },
  ];

  const purchaseOrderColumns: TableColumn<UserStatsPurchaseOrderRow>[] = [
    {
      key: 'orderNumber',
      header: tr.crm.purchaseOrders.numberColumn,
      render: (o) => <span className="font-semibold text-app-text">{o.orderNumber}</span>,
    },
    {
      key: 'quote',
      header: tr.crm.purchaseOrders.quoteColumn,
      className: 'text-app-muted',
      render: (o) => o.quote?.quoteNumber ?? '—',
    },
    {
      key: 'status',
      header: tr.crm.purchaseOrders.statusColumn,
      render: (o) => (
        <Badge variant="info">
          {tr.crm.purchaseOrders.statusOptions[
            o.status as keyof typeof tr.crm.purchaseOrders.statusOptions
          ] ?? o.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: tr.crm.purchaseOrders.createdAtColumn,
      className: 'text-app-muted',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  const salesOrderColumns: TableColumn<UserStatsSalesOrderRow>[] = [
    {
      key: 'orderNumber',
      header: tr.crm.salesOrders.numberColumn,
      render: (o) => <span className="font-semibold text-app-text">{o.orderNumber}</span>,
    },
    {
      key: 'account',
      header: tr.crm.salesOrders.accountColumn,
      render: (o) => o.account.name,
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
        <Badge variant="info">
          {tr.crm.salesOrders.statusOptions[
            o.status as keyof typeof tr.crm.salesOrders.statusOptions
          ] ?? o.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: tr.crm.salesOrders.createdAtColumn,
      className: 'text-app-muted',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return {
    accounts: {
      columns: accountColumns,
      onRowClick: (row: UserStatsAccountRow) => navigate(`/firmalar/${buildAccountSlug(row)}`),
    },
    contacts: {
      columns: contactColumns,
      onRowClick: (row: UserStatsContactRow) => navigate(`/kisiler/${row.id}`),
    },
    interactions: {
      columns: interactionColumns,
      onRowClick: (row: UserStatsInteractionRow) => navigate(`/gorusmeler/${row.id}`),
    },
    opportunities: {
      columns: opportunityColumns,
      onRowClick: (row: UserStatsOpportunityRow) => navigate(`/firsatlar/${row.id}`),
    },
    quotes: {
      columns: quoteColumns,
      onRowClick: (row: UserStatsQuoteRow) => navigate(`/teklifler/${row.id}`),
    },
    projects: {
      columns: projectColumns,
      onRowClick: (row: UserStatsProjectRow) => navigate(`/projeler/${row.projectNumber}`),
    },
    purchaseOrders: {
      columns: purchaseOrderColumns,
      onRowClick: (row: UserStatsPurchaseOrderRow) => navigate(`/siparisler/${row.id}`),
    },
    salesOrders: {
      columns: salesOrderColumns,
      onRowClick: (row: UserStatsSalesOrderRow) => navigate(`/satis-siparisleri/${row.id}`),
    },
  } as const;
}

/** "Oluşturduğu Teklifler" karti acildiginda tablonun ustunde gosterilen iki grafik -
 * /teklifler?tab=reports'taki ayni iki pasta grafik (bkz. quote-reports-content.tsx),
 * ama tum tenant yerine sadece bu kullanicinin olusturdugu tekliflere daraltilmis
 * (`createdById`). Tarih filtresi/notlar tablosu burada yok - sadece karti tiklayinca
 * ani bir ozet istendi. */
function QuoteChartsSection({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const theme = getChartTheme();
  const statusCounts = useQuoteStatusCounts(
    QUOTE_STATUS_OPTIONS.map((option) => option.value),
    { createdById: userId },
  );
  const rejectionReasonsQuery = useQuoteRejectionReasonsSummaryQuery({ createdById: userId });

  function goToUsersQuotes(status?: QuoteStatus) {
    const params = new URLSearchParams({ tab: 'quotes', createdById: userId });
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

  const rejectionReasonPoints = (rejectionReasonsQuery.data ?? []).map((row) => ({
    name: row.reason ?? tr.crm.quoteReports.rejectionReasonUnspecified,
    value: row.count,
  }));
  const hasRejectedQuotes = rejectionReasonPoints.length > 0;
  const rejectionReasonsOption = buildPieOptionFromPoints(theme, rejectionReasonPoints, (value) =>
    numberFormatter.format(value),
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <ChartCard title={tr.crm.quoteReports.statusDistributionTitle}>
        {hasQuotes ? (
          <ChartWithExport
            option={statusDistributionOption}
            fileName={tr.crm.quoteReports.statusDistributionTitle}
            onEvents={{
              click: (params) =>
                goToUsersQuotes(statusDistributionPoints[params.dataIndex]?.status),
            }}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
        )}
      </ChartCard>
      <ChartCard title={tr.crm.quoteReports.rejectionReasonsTitle}>
        {hasRejectedQuotes ? (
          <ChartWithExport
            option={rejectionReasonsOption}
            fileName={tr.crm.quoteReports.rejectionReasonsTitle}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quoteReports.rejectionReasonsEmpty}</p>
        )}
      </ChartCard>
    </div>
  );
}

/** "Oluşturduğu Görüşmeler" karti acildiginda tablonun ustunde gosterilen durum
 * dagilim grafigi - QuoteChartsSection ile ayni desen, ama Interaction.status
 * (OPEN/CLOSED) icin. Dilime tiklaninca /gorusmeler sayfasina bu kullaniciya ve
 * tiklanan duruma filtrelenmis sekilde gider (bkz. interactions-list-page.tsx'teki
 * URL destegi). */
function InteractionChartsSection({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const theme = getChartTheme();
  const statusCounts = useInteractionStatusCounts(
    INTERACTION_STATUS_OPTIONS.map((option) => option.value),
    { createdById: userId },
  );

  function goToUsersInteractions(status?: InteractionStatus) {
    const params = new URLSearchParams({ createdById: userId });
    if (status) params.set('status', status);
    navigate(`/gorusmeler?${params.toString()}`);
  }

  const statusDistributionPoints = INTERACTION_STATUS_OPTIONS.map((option) => ({
    status: option.value,
    name: option.label,
    value: statusCounts.counts[option.value] ?? 0,
  })).filter((point) => point.value > 0);
  const hasInteractions = statusDistributionPoints.length > 0;
  const statusDistributionOption = buildPieOptionFromPoints(
    theme,
    statusDistributionPoints,
    (value) => numberFormatter.format(value),
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <ChartCard title={tr.crm.interactions.statusDistributionTitle}>
        {hasInteractions ? (
          <ChartWithExport
            option={statusDistributionOption}
            fileName={tr.crm.interactions.statusDistributionTitle}
            onEvents={{
              click: (params) =>
                goToUsersInteractions(statusDistributionPoints[params.dataIndex]?.status),
            }}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.interactions.statusDistributionEmpty}</p>
        )}
      </ChartCard>
    </div>
  );
}

function EntityRowsTable({
  entity,
  userId,
  config,
}: {
  entity: UserStatsEntityKind;
  userId: string;
  config: ReturnType<typeof useEntityTableConfig>;
}) {
  const rowsQuery = useUserStatsEntityQuery(userId, entity);
  const { columns, onRowClick } = config[entity];

  return (
    <div className="mt-6 rounded-xl border border-app-border bg-white p-5">
      {/* `as any` yok - her entity'nin kolon/satir tipleri birbirine karismaz, Table
       * burada tek bir `entity` degeri icin (her render'da ayni) ayri ayri cagriliyor. */}
      <Table
        columns={columns as TableColumn<never>[]}
        data={(rowsQuery.data ?? []) as never[]}
        keyField={(row) => (row as { id: string }).id}
        isLoading={rowsQuery.isPending}
        loadingMessage={tr.common.loading}
        emptyMessage={strings.tableEmpty}
        onRowClick={onRowClick as (row: never) => void}
      />
    </div>
  );
}

export function UserStatsPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const id = extractUserId(slug);
  const statsQuery = useUserStatsQuery(id);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<UserStatsEntityKind | null>(null);
  const entityTableConfig = useEntityTableConfig(navigate);

  function toggleEntity(entity: UserStatsEntityKind) {
    setSelectedEntity((current) => (current === entity ? null : entity));
  }

  return (
    <AppShell>
      <BackLink to="/settings?tab=users" label={strings.back} />

      {statsQuery.isPending && <p className="mt-6 text-sm text-app-muted">{tr.common.loading}</p>}

      {statsQuery.data && (
        <>
          <div className="mt-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {statsQuery.data.user.avatarUrl ? (
                <img
                  src={statsQuery.data.user.avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-app-bg-muted text-lg font-bold text-app-muted">
                  {statsQuery.data.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-app-text">{statsQuery.data.user.name}</h1>
                  <PageHelp text={tr.help.userStats} />
                </div>
                <p className="text-sm text-app-muted">{statsQuery.data.user.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {statsQuery.data.user.roles.map((role) => (
                    <Badge key={role.id}>{role.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <CircleIconButton
              icon={Mail}
              tooltip={strings.sendMessageTooltip}
              onClick={() => setIsMessageModalOpen(true)}
            />
          </div>
          <p className="mt-2 text-sm text-app-muted">{strings.subtitle}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={strings.accountsLabel}
              value={statsQuery.data.counts.accounts}
              isSelected={selectedEntity === 'accounts'}
              onClick={() => toggleEntity('accounts')}
            />
            <StatCard
              label={strings.contactsLabel}
              value={statsQuery.data.counts.contacts}
              isSelected={selectedEntity === 'contacts'}
              onClick={() => toggleEntity('contacts')}
            />
            <StatCard
              label={strings.interactionsLabel}
              value={statsQuery.data.counts.interactions}
              isSelected={selectedEntity === 'interactions'}
              onClick={() => toggleEntity('interactions')}
            />
            <StatCard
              label={strings.opportunitiesLabel}
              value={statsQuery.data.counts.opportunities}
              isSelected={selectedEntity === 'opportunities'}
              onClick={() => toggleEntity('opportunities')}
            />
            <StatCard
              label={strings.quotesLabel}
              value={statsQuery.data.counts.quotes}
              isSelected={selectedEntity === 'quotes'}
              onClick={() => toggleEntity('quotes')}
            />
            <StatCard
              label={strings.projectsLabel}
              value={statsQuery.data.counts.projects}
              isSelected={selectedEntity === 'projects'}
              onClick={() => toggleEntity('projects')}
            />
            <StatCard
              label={strings.purchaseOrdersLabel}
              value={statsQuery.data.counts.purchaseOrders}
              isSelected={selectedEntity === 'purchaseOrders'}
              onClick={() => toggleEntity('purchaseOrders')}
            />
            <StatCard
              label={strings.salesOrdersLabel}
              value={statsQuery.data.counts.salesOrders}
              isSelected={selectedEntity === 'salesOrders'}
              onClick={() => toggleEntity('salesOrders')}
            />
          </div>

          {selectedEntity && (
            <>
              {selectedEntity === 'quotes' && <QuoteChartsSection userId={id} />}
              {selectedEntity === 'interactions' && <InteractionChartsSection userId={id} />}
              <EntityRowsTable entity={selectedEntity} userId={id} config={entityTableConfig} />
            </>
          )}

          <div className="mt-6 rounded-xl border border-app-border bg-white p-5">
            <h2 className="mb-4 text-[11px] font-bold tracking-wide text-app-muted uppercase">
              {strings.responsibleProjectsTitle}
            </h2>
            <Table
              columns={RESPONSIBLE_PROJECT_COLUMNS}
              data={statsQuery.data.responsibleProjects}
              keyField={(project) => project.id}
              onRowClick={(project) => navigate(`/projeler/${project.projectNumber}`)}
              getRowHref={(project) => `/projeler/${project.projectNumber}`}
              emptyMessage={strings.noResponsibleProjects}
            />
          </div>
        </>
      )}

      {isMessageModalOpen && statsQuery.data && (
        <NewMessageModal
          onClose={() => setIsMessageModalOpen(false)}
          defaultToUserIds={[statsQuery.data.user.id]}
        />
      )}
    </AppShell>
  );
}
