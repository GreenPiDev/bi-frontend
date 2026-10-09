import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartCard } from '../components/ui/chart-card';
import { CollapsibleSection } from '../components/ui/collapsible-section';
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

function RejectedQuotesReasonsTable() {
  const navigate = useNavigate();
  const rejectedQuotesQuery = useRejectedQuotesWithReasonsQuery();
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

export function QuoteReportsContent({ isPrintMode = false }: { isPrintMode?: boolean }) {
  const navigate = useNavigate();
  const statusCounts = useQuoteStatusCounts(QUOTE_STATUS_OPTIONS.map((option) => option.value));
  const rejectionReasonsQuery = useQuoteRejectionReasonsSummaryQuery();
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
          <RejectedQuotesReasonsTable />
        </CollapsibleSection>
      )}
    </div>
  );
}
