import { useOpportunityStageCounts } from '../features/crm/use-opportunities';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { tr } from '../i18n/tr';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /raporlar "Fırsatlar" tab'i - su an sadece ozet KPI kartlari, kullanici bu tab'i
 * ileride ayrica genisletecek (bkz. CLAUDE.md gorev notu). "Devam Eden" = toplam -
 * kazanilan - kaybedilen (NEW+QUALIFIED+PROPOSAL asamalarinin toplami). */
export function OpportunityReportsContent() {
  const stageCounts = useOpportunityStageCounts(['WON', 'LOST']);
  const total = stageCounts.all;
  const won = stageCounts.counts.WON;
  const lost = stageCounts.counts.LOST;
  const open =
    total !== undefined && won !== undefined && lost !== undefined ? total - won - lost : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ReportKpiCard
          label={tr.reports.opportunitiesKpi.totalLabel}
          value={total !== undefined ? numberFormatter.format(total) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.opportunitiesKpi.openLabel}
          value={open !== undefined ? numberFormatter.format(open) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.opportunitiesKpi.wonLabel}
          value={won !== undefined ? numberFormatter.format(won) : undefined}
        />
        <ReportKpiCard
          label={tr.reports.opportunitiesKpi.lostLabel}
          value={lost !== undefined ? numberFormatter.format(lost) : undefined}
        />
      </div>
    </div>
  );
}
