import { useInteractionReportCounts } from '../features/crm/use-interactions';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { tr } from '../i18n/tr';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /raporlar "Görüşmeler" tab'i - su an sadece ozet KPI kartlari, kullanici bu tab'i
 * ileride ayrica genisletecek (bkz. CLAUDE.md gorev notu). */
export function InteractionReportsContent() {
  const counts = useInteractionReportCounts();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        <ReportKpiCard
          label={tr.reports.interactionsKpi.totalLabel}
          value={counts.total !== undefined ? numberFormatter.format(counts.total) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.interactionsKpi.openLabel}
          value={counts.open !== undefined ? numberFormatter.format(counts.open) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.interactionsKpi.closedLabel}
          value={counts.closed !== undefined ? numberFormatter.format(counts.closed) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.interactionsKpi.thisWeekLabel}
          value={
            counts.thisWeek !== undefined ? numberFormatter.format(counts.thisWeek) : undefined
          }
        />
        <ReportKpiCard
          label={tr.reports.interactionsKpi.thisMonthLabel}
          value={
            counts.thisMonth !== undefined ? numberFormatter.format(counts.thisMonth) : undefined
          }
        />
      </div>
    </div>
  );
}
