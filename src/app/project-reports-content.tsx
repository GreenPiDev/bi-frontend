import { useProjectAggregatesQuery } from '../features/crm/use-projects';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { formatCurrencyAmount } from '../lib/quote-totals';
import { tr } from '../i18n/tr';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /raporlar "Projeler" tab'i - su an sadece ozet KPI kartlari, kullanici bu tab'i
 * ileride ayrica genisletecek (bkz. CLAUDE.md gorev notu). Butce/maliyet alanlari
 * tek para birimi (TRY) uzerinden tutuluyor (Project modelinde currency alani yok). */
export function ProjectReportsContent() {
  const aggregatesQuery = useProjectAggregatesQuery();
  const data = aggregatesQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportKpiCard
          label={tr.reports.projectsKpi.totalLabel}
          value={data ? numberFormatter.format(data.total) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.projectsKpi.estimatedBudgetLabel}
          value={data ? formatCurrencyAmount(data.estimatedBudgetTotal, 'TRY') : undefined}
        />
        <ReportKpiCard
          label={tr.reports.projectsKpi.actualCostLabel}
          value={data ? formatCurrencyAmount(data.actualCostTotal, 'TRY') : undefined}
        />
        <ReportKpiCard
          label={tr.reports.projectsKpi.withQuoteLabel}
          value={data ? numberFormatter.format(data.withQuoteCount) : undefined}
        />
      </div>
    </div>
  );
}
