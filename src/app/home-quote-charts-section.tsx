import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartCard } from '../components/ui/chart-card';
import { CollapsibleSection } from '../components/ui/collapsible-section';
import { Select } from '../components/ui/select';
import { QUOTE_CURRENCY_OPTIONS } from '../features/crm/quote-meta-fields';
import { useQuoteStatusCounts, useQuoteValueByStatusQuery } from '../features/crm/use-quotes';
import { ChartWithExport } from '../features/dashboards/widgets/chart-with-export';
import { getChartTheme } from '../features/dashboards/widgets/chart-theme';
import { buildPieOptionFromPoints } from '../features/dashboards/widgets/query-result-to-echarts-option';
import { tr } from '../i18n/tr';
import type { QuoteStatus } from '../lib/api';
import { formatCurrencyAmount, QUOTE_STATUS_OPTIONS } from '../lib/quote-totals';

const numberFormatter = new Intl.NumberFormat('tr-TR');

/** /anasayfa'da "Not Defteri"nin ustunde, tam genislikte collapsible bir bolum -
 * /teklifler?tab=reports'taki uc grafikten "Reddedilme Sebepleri" disinda kalan iki
 * grafigi (Mevcut Durum Dagilimi, Durum Bazli Toplam Deger) gosterir. Veri/hesaplama
 * mantigi quote-reports-content.tsx ile ayni hook'lardan geliyor, ama o sayfanin
 * tarih filtresi/KPI kartlari burada yok - her zaman tum zamanlar. */
export function HomeQuoteChartsSection() {
  const navigate = useNavigate();
  const [valueByStatusCurrency, setValueByStatusCurrency] = useState('TRY');

  const statusCounts = useQuoteStatusCounts(QUOTE_STATUS_OPTIONS.map((option) => option.value));
  const valueByStatusQuery = useQuoteValueByStatusQuery({}, valueByStatusCurrency);
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
    'bottom',
  );

  const statusLabelByValue = new Map(
    QUOTE_STATUS_OPTIONS.map((option) => [option.value, option.label]),
  );
  const valueByStatusPoints = (valueByStatusQuery.data?.totals ?? []).map((row) => ({
    status: row.status,
    name: statusLabelByValue.get(row.status) ?? row.status,
    value: row.amount,
  }));
  const hasQuoteValue = valueByStatusPoints.length > 0;
  const valueByStatusOption = buildPieOptionFromPoints(
    theme,
    valueByStatusPoints,
    (value) => formatCurrencyAmount(value, valueByStatusCurrency),
    'bottom',
  );
  const valueByStatusMissingRates = valueByStatusQuery.data?.missingRateCurrencies ?? [];

  return (
    <CollapsibleSection title={tr.home.quoteCharts.title} className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title={tr.crm.quoteReports.statusDistributionTitle}>
          {hasQuotes ? (
            <ChartWithExport
              option={statusDistributionOption}
              fileName={tr.crm.quoteReports.statusDistributionTitle}
              onEvents={{
                click: (params) => goToQuotes(statusDistributionPoints[params.dataIndex]?.status),
              }}
            />
          ) : (
            <p className="text-sm text-app-muted">{tr.crm.quotes.costTab.empty}</p>
          )}
        </ChartCard>

        <ChartCard
          title={tr.crm.quoteReports.valueByStatusTitle}
          headerAction={
            <Select
              label={tr.crm.quoteReports.valueByStatusCurrencyLabel}
              hideLabel
              options={QUOTE_CURRENCY_OPTIONS}
              value={valueByStatusCurrency}
              onChange={(event) => setValueByStatusCurrency(event.target.value)}
              className="py-1.5 text-xs"
            />
          }
        >
          {hasQuoteValue ? (
            <>
              <ChartWithExport
                option={valueByStatusOption}
                fileName={tr.crm.quoteReports.valueByStatusTitle}
                onEvents={{
                  click: (params) => goToQuotes(valueByStatusPoints[params.dataIndex]?.status),
                }}
              />
              {valueByStatusMissingRates.length > 0 && (
                <p className="mt-1 text-xs text-app-danger">
                  {tr.crm.quoteReports.valueByStatusMissingRateWarning(
                    valueByStatusMissingRates.join(', '),
                  )}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-app-muted">{tr.crm.quoteReports.valueByStatusEmpty}</p>
          )}
        </ChartCard>
      </div>
    </CollapsibleSection>
  );
}
