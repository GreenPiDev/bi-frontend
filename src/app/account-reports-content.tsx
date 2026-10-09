import { useAccountReportCounts } from '../features/crm/use-accounts';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { tr } from '../i18n/tr';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /raporlar "Firmalar" tab'i - su an sadece ozet KPI kartlari, kullanici bu tab'i
 * ileride ayrica genisletecek (bkz. CLAUDE.md gorev notu). */
export function AccountReportsContent() {
  const counts = useAccountReportCounts();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportKpiCard
          label={tr.reports.accountsKpi.totalLabel}
          value={counts.total !== undefined ? numberFormatter.format(counts.total) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.accountsKpi.thisMonthLabel}
          value={
            counts.thisMonth !== undefined ? numberFormatter.format(counts.thisMonth) : undefined
          }
        />
        <ReportKpiCard
          label={tr.reports.accountsKpi.notContacted30Label}
          value={
            counts.notContacted30 !== undefined
              ? numberFormatter.format(counts.notContacted30)
              : undefined
          }
        />
        <ReportKpiCard
          label={tr.reports.accountsKpi.notContacted60Label}
          value={
            counts.notContacted60 !== undefined
              ? numberFormatter.format(counts.notContacted60)
              : undefined
          }
        />
      </div>
    </div>
  );
}
