import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { CollapsibleSection } from '../../components/ui/collapsible-section';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';
import {
  DEFAULT_STOCK_HOLDING_COST,
  STOCK_HOLDING_COST_KEY,
  type StockHoldingCostSetting,
} from '../crm/tenant-settings.constants';
import { useTenantSettingsQuery, useUpdateTenantSettingMutation } from '../crm/use-tenant-settings';

function isStockHoldingCostSetting(value: unknown): value is StockHoldingCostSetting {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StockHoldingCostSetting).enabled === 'boolean' &&
    typeof (value as StockHoldingCostSetting).monthlyRatePct === 'number'
  );
}

/** Ad-hoc (bkz. CLAUDE.md) - stogu olan urunlerin birim maliyetinin her gun
 * (00:30, Europe/Istanbul) belirlenen aylik orana denk gelecek sekilde gune
 * bolunmus bilesik bir oranla otomatik artmasini saglayan opsiyonel ayar.
 * InactivityThresholdSetting/PostSaleFollowUpDaysSetting ile ayni "tek
 * CollapsibleSection + tek Kaydet" deseni, tek fark bir Switch + sayi
 * alaninin birlikte tek JSON deger olarak kaydedilmesi. */
export function StockHoldingCostSection() {
  const toast = useToast();
  const settingsQuery = useTenantSettingsQuery();
  const updateMutation = useUpdateTenantSettingMutation();
  const [enabled, setEnabled] = useState(DEFAULT_STOCK_HOLDING_COST.enabled);
  const [rateInput, setRateInput] = useState('');

  const currentSetting = settingsQuery.data?.find(
    (setting) => setting.key === STOCK_HOLDING_COST_KEY,
  );

  const [prevSettingValue, setPrevSettingValue] = useState<unknown>(undefined);
  if (currentSetting && currentSetting.value !== prevSettingValue) {
    setPrevSettingValue(currentSetting.value);
    const value = isStockHoldingCostSetting(currentSetting.value)
      ? currentSetting.value
      : DEFAULT_STOCK_HOLDING_COST;
    setEnabled(value.enabled);
    setRateInput(String(value.monthlyRatePct));
  }

  function handleSave() {
    const monthlyRatePct = Number(rateInput);
    if (!Number.isFinite(monthlyRatePct) || monthlyRatePct < 0 || monthlyRatePct > 100) {
      return;
    }
    updateMutation.mutate(
      { key: STOCK_HOLDING_COST_KEY, value: { enabled, monthlyRatePct } },
      {
        onSuccess: () => toast.success(tr.settings.stockHoldingCost.saveSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <CollapsibleSection
      title={tr.settings.stockHoldingCost.title}
      subtitle={tr.settings.stockHoldingCost.subtitle}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label={tr.settings.stockHoldingCost.enabledLabel}
          />
          <span className="text-sm font-semibold text-app-text">
            {tr.settings.stockHoldingCost.enabledLabel}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stock-holding-cost-rate"
              className="text-sm font-semibold text-app-muted"
            >
              {tr.settings.stockHoldingCost.rateLabel}
            </label>
            <input
              id="stock-holding-cost-rate"
              type="text"
              inputMode="decimal"
              disabled={!enabled}
              value={rateInput}
              onChange={(event) => setRateInput(event.target.value.replace(/[^0-9.]/g, ''))}
              className="w-32 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:border-app-primary disabled:opacity-50"
            />
          </div>
          <Button type="button" disabled={updateMutation.isPending} onClick={handleSave}>
            {tr.settings.stockHoldingCost.saveButton}
          </Button>
        </div>
        <p className="text-xs text-app-muted">{tr.settings.stockHoldingCost.hint}</p>
      </div>
    </CollapsibleSection>
  );
}
