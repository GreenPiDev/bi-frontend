import { ListFilter } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ChartCard } from '../components/ui/chart-card';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { CollapsibleSection } from '../components/ui/collapsible-section';
import { DateField } from '../components/ui/date-field';
import { Drawer } from '../components/ui/drawer';
import { Modal } from '../components/ui/modal';
import { Table, type TableColumn } from '../components/ui/table';
import { TruncatedTextCell } from '../components/ui/truncated-text-cell';
import {
  useQuoteRejectionReasonsSummaryQuery,
  useQuoteStatusCounts,
  useRejectedQuotesWithReasonsQuery,
} from '../features/crm/use-quotes';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import { tr } from '../i18n/tr';
import type { QuoteStatus, RejectedQuoteReasonRow } from '../lib/api';
import { QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';

const numberFormatter = new Intl.NumberFormat('tr-TR');
const dateFormatter = new Intl.DateTimeFormat('tr-TR');

function RejectedQuotesReasonsTable({ range }: { range: { from?: string; to?: string } }) {
  const navigate = useNavigate();
  const rejectedQuotesQuery = useRejectedQuotesWithReasonsQuery(range);
  const rows = (rejectedQuotesQuery.data ?? []).filter((row) => Boolean(row.note));
  const [noteModalRow, setNoteModalRow] = useState<RejectedQuoteReasonRow | null>(null);

  const columns: TableColumn<RejectedQuoteReasonRow>[] = [
    {
      key: 'quoteNumber',
      header: tr.crm.quoteReports.rejectionNotesTable.quoteColumn,
      render: (row) => row.quoteNumber,
    },
    {
      key: 'accountName',
      header: tr.crm.quoteReports.rejectionNotesTable.accountColumn,
      render: (row) => row.accountName,
    },
    {
      key: 'rejectedAt',
      header: tr.crm.quoteReports.rejectionNotesTable.dateColumn,
      render: (row) => (row.rejectedAt ? dateFormatter.format(new Date(row.rejectedAt)) : '—'),
    },
    {
      key: 'reason',
      header: tr.crm.quoteReports.rejectionNotesTable.reasonColumn,
      render: (row) => row.reason ?? tr.crm.quoteReports.rejectionReasonUnspecified,
    },
    {
      key: 'note',
      header: tr.crm.quoteReports.rejectionNotesTable.noteColumn,
      className: 'max-w-xs text-app-muted',
      render: (row) => <TruncatedTextCell text={row.note} onOpen={() => setNoteModalRow(row)} />,
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={rows}
        keyField={(row) => row.id}
        onRowClick={(row) => navigate(`/teklifler/${row.id}`)}
        isLoading={rejectedQuotesQuery.isLoading}
        emptyMessage={tr.crm.quoteReports.rejectionNotesTable.empty}
      />
      {noteModalRow && (
        <Modal
          title={tr.crm.quoteReports.rejectionNotesTable.noteModalTitle}
          onClose={() => setNoteModalRow(null)}
        >
          <p className="whitespace-pre-wrap text-sm text-app-text">{noteModalRow.note}</p>
        </Modal>
      )}
    </>
  );
}

function KpiCard({
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
      className="flex cursor-pointer flex-col items-center gap-1 border border-app-border bg-app-surface p-4 text-center transition-colors hover:border-app-brand hover:bg-app-bg-muted"
    >
      <span className="text-2xl font-bold text-app-text">
        {value === undefined ? '—' : numberFormatter.format(value)}
      </span>
      <span className="text-sm font-medium text-app-muted">{label}</span>
    </button>
  );
}

export function QuoteReportsContent({
  isPrintMode = false,
  headerActions,
}: {
  isPrintMode?: boolean;
  /** Filtre butonuyla ayni satira, butonun soluna yerlestirilen ekstra aksiyon(lar) -
   * ornegin /raporlar?tab=quotes'teki PDF disa aktarma butonu (bkz. reports-page.tsx). */
  headerActions?: ReactNode;
}) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sinceInput, setSinceInput] = useState('');
  const [rangeFromInput, setRangeFromInput] = useState('');
  const [rangeToInput, setRangeToInput] = useState('');
  // Iki tarih filtresi ayni quoteDate alanini hedefler, birbirini sifirlar: aralik
  // girildiyse tek-tarih ("itibaren") gormezden gelinir (bkz. quotes-list-page.tsx).
  const hasRange = Boolean(rangeFromInput) || Boolean(rangeToInput);
  const from = hasRange ? rangeFromInput || undefined : sinceInput || undefined;
  const to = hasRange ? rangeToInput || undefined : undefined;
  const hasActiveFilter = Boolean(from) || Boolean(to);
  const range = { from, to };

  function resetFilters() {
    setSinceInput('');
    setRangeFromInput('');
    setRangeToInput('');
  }

  const activeFilterLabel = !hasActiveFilter
    ? tr.crm.quoteReports.activeFilterAll
    : from && to
      ? tr.crm.quoteReports.activeFilterRangeBoth(
          dateFormatter.format(new Date(from)),
          dateFormatter.format(new Date(to)),
        )
      : from
        ? tr.crm.quoteReports.activeFilterSince(dateFormatter.format(new Date(from)))
        : tr.crm.quoteReports.activeFilterRangeTo(dateFormatter.format(new Date(to as string)));

  const statusCounts = useQuoteStatusCounts(
    QUOTE_STATUS_OPTIONS.map((option) => option.value),
    range,
  );
  const rejectionReasonsQuery = useQuoteRejectionReasonsSummaryQuery(range);
  const theme = getChartTheme();

  function goToQuotes(status?: QuoteStatus) {
    const params = new URLSearchParams({ tab: 'quotes' });
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-app-muted">{activeFilterLabel}</p>
        {!isPrintMode && (
          <div className="flex items-center gap-2">
            {headerActions}
            <CircleIconButton
              icon={ListFilter}
              tooltip={tr.crm.quoteReports.filterButton}
              onClick={() => setDrawerOpen(true)}
            >
              {hasActiveFilter && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-app-surface" />
              )}
            </CircleIconButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard
          label={tr.crm.quoteReports.totalLabel}
          value={statusCounts.all}
          onClick={() => goToQuotes()}
        />
        {QUOTE_STATUS_OPTIONS.map((option) => (
          <KpiCard
            key={option.value}
            label={option.label}
            value={statusCounts.counts[option.value]}
            onClick={() => goToQuotes(option.value)}
          />
        ))}
      </div>

      <ChartCard title={tr.crm.quoteReports.statusDistributionTitle}>
        {hasQuotes ? (
          <ChartWithExport
            option={statusDistributionOption}
            fileName={tr.crm.quoteReports.statusDistributionTitle}
            hideExportButton={isPrintMode}
            onEvents={{
              click: (params) => goToQuotes(statusDistributionPoints[params.dataIndex]?.status),
            }}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
        )}
      </ChartCard>

      {/* PDF'te sayfa sonuna denk gelince ikiye bolunmesini onlemek icin ikinci
       * grafik her zaman yeni bir sayfadan baslar (bkz. index.css .print-page-break,
       * quote-detail-page.tsx'teki ayni desen). */}
      <ChartCard
        title={tr.crm.quoteReports.rejectionReasonsTitle}
        className={isPrintMode ? 'print-page-break' : undefined}
      >
        {hasRejectedQuotes ? (
          <ChartWithExport
            option={rejectionReasonsOption}
            fileName={tr.crm.quoteReports.rejectionReasonsTitle}
            hideExportButton={isPrintMode}
          />
        ) : (
          <p className="text-sm text-app-muted">{tr.crm.quoteReports.rejectionReasonsEmpty}</p>
        )}
      </ChartCard>

      {!isPrintMode && (
        <CollapsibleSection
          title={tr.crm.quoteReports.rejectionNotesSectionTitle}
          subtitle={tr.crm.quoteReports.rejectionNotesSectionSubtitle}
        >
          <RejectedQuotesReasonsTable range={range} />
        </CollapsibleSection>
      )}

      {drawerOpen && (
        <Drawer title={tr.crm.quoteReports.filterDrawer.title} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col gap-4">
            <DateField
              label={tr.crm.quoteReports.filterDrawer.sinceLabel}
              value={sinceInput}
              onChange={(value) => {
                setRangeFromInput('');
                setRangeToInput('');
                setSinceInput(value);
              }}
              clearable
              onClear={() => setSinceInput('')}
            />
            <DateField
              label={tr.crm.quoteReports.filterDrawer.rangeFromLabel}
              value={rangeFromInput}
              onChange={(value) => {
                setSinceInput('');
                setRangeFromInput(value);
              }}
              clearable
              onClear={() => setRangeFromInput('')}
            />
            <DateField
              label={tr.crm.quoteReports.filterDrawer.rangeToLabel}
              value={rangeToInput}
              onChange={(value) => {
                setSinceInput('');
                setRangeToInput(value);
              }}
              clearable
              onClear={() => setRangeToInput('')}
            />
            <Button type="button" variant="secondary" onClick={resetFilters}>
              {tr.crm.quoteReports.filterDrawer.reset}
            </Button>
          </div>
        </Drawer>
      )}
    </div>
  );
}
