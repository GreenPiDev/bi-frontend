import { useContactStatusCounts } from '../features/crm/use-contacts';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { tr } from '../i18n/tr';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /raporlar "Kişiler" tab'i - su an sadece ozet KPI kartlari, kullanici bu tab'i
 * ileride ayrica genisletecek (bkz. CLAUDE.md gorev notu). */
export function ContactReportsContent() {
  const counts = useContactStatusCounts();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <ReportKpiCard
          label={tr.reports.contactsKpi.totalLabel}
          value={counts.total !== undefined ? numberFormatter.format(counts.total) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.contactsKpi.activeLabel}
          value={counts.active !== undefined ? numberFormatter.format(counts.active) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.contactsKpi.inactiveLabel}
          value={
            counts.inactive !== undefined ? numberFormatter.format(counts.inactive) : undefined
          }
        />
      </div>
    </div>
  );
}
