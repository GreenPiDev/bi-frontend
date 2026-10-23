import { useNavigate } from 'react-router-dom';
import { useOpportunityStageCounts } from '../features/crm/use-opportunities';
import { ChartCard } from '../components/ui/chart-card';
import { ReportKpiCard } from '../components/ui/report-kpi-card';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import { tr } from '../i18n/tr';
import type { OpportunityStage } from '../lib/api';

const numberFormatter = new Intl.NumberFormat('tr-TR');

const STAGES = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
] as const satisfies readonly OpportunityStage[];

/** /raporlar "Fırsatlar" tab'i - su an toplam + her asama icin ayri bir KPI karti + asama
 * dagilimi pasta grafigi (quote-reports-content.tsx'teki "Mevcut Durum Dağılımı"
 * grafigiyle ayni desen), kullanici bu tab'i ileride ayrica genisletecek (bkz. CLAUDE.md
 * gorev notu). */
export function OpportunityReportsContent() {
  const navigate = useNavigate();
  const stageCounts = useOpportunityStageCounts(STAGES);
  const total = stageCounts.all;
  const theme = getChartTheme();

  const stageDistributionPoints = STAGES.map((stage) => ({
    stage,
    name: tr.crm.opportunities.stageOptions[stage],
    value: stageCounts.counts[stage] ?? 0,
  })).filter((point) => point.value > 0);
  const hasOpportunities = stageDistributionPoints.length > 0;
  const stageDistributionOption = buildPieOptionFromPoints(
    theme,
    stageDistributionPoints,
    (value) => numberFormatter.format(value),
    'bottom',
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        <ReportKpiCard
          label={tr.reports.opportunitiesKpi.totalLabel}
          value={total !== undefined ? numberFormatter.format(total) : undefined}
          onClick={() => navigate('/firsatlar')}
        />
        {STAGES.map((stage) => (
          <ReportKpiCard
            key={stage}
            label={tr.crm.opportunities.stageOptions[stage]}
            value={
              stageCounts.counts[stage] !== undefined
                ? numberFormatter.format(stageCounts.counts[stage] as number)
                : undefined
            }
            onClick={() => navigate('/firsatlar')}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title={tr.reports.opportunityStageDistributionTitle}>
          {hasOpportunities ? (
            <ChartWithExport
              option={stageDistributionOption}
              fileName={tr.reports.opportunityStageDistributionTitle}
              onEvents={{
                click: () => navigate('/firsatlar'),
              }}
            />
          ) : (
            <p className="text-sm text-app-muted">{tr.reports.opportunityStageDistributionEmpty}</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
