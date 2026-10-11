import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StockHoldingCostSection } from './stock-holding-cost-section';
import { ToastProvider } from '../../components/ui/toast';
import * as api from '../../lib/api';

async function renderSection() {
  const queryClient = new QueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StockHoldingCostSection />
      </ToastProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  const header = await screen.findByRole('button', { expanded: false });
  await user.click(header);
  return { ...result, user };
}

describe('StockHoldingCostSection', () => {
  it('varsayılan (kapalı) ayarla render edilir', async () => {
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      {
        key: 'crm.stockHoldingCost',
        value: { enabled: false, monthlyRatePct: 0 },
        isDefault: true,
      },
    ]);
    await renderSection();
    expect(await screen.findByLabelText('Aylık oran (%)')).toHaveValue('0');
    expect(await screen.findByLabelText('Aylık oran (%)')).toBeDisabled();
  });

  it('mevcut etkin ayarı dolu gösterir ve oran değiştirip kaydeder', async () => {
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      {
        key: 'crm.stockHoldingCost',
        value: { enabled: true, monthlyRatePct: 3.5 },
        isDefault: false,
      },
    ]);
    const updateSpy = vi.spyOn(api, 'updateTenantSetting').mockResolvedValue({
      key: 'crm.stockHoldingCost',
      value: { enabled: true, monthlyRatePct: 4 },
      isDefault: false,
    });

    const { user } = await renderSection();
    const rateInput = await screen.findByLabelText('Aylık oran (%)');
    expect(rateInput).toHaveValue('3.5');
    expect(rateInput).toBeEnabled();

    await user.clear(rateInput);
    await user.type(rateInput, '4');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(updateSpy).toHaveBeenCalledWith('crm.stockHoldingCost', {
      enabled: true,
      monthlyRatePct: 4,
    });
  });

  it('kapatıp kaydederse enabled:false gönderir', async () => {
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      {
        key: 'crm.stockHoldingCost',
        value: { enabled: true, monthlyRatePct: 3.5 },
        isDefault: false,
      },
    ]);
    const updateSpy = vi.spyOn(api, 'updateTenantSetting').mockResolvedValue({
      key: 'crm.stockHoldingCost',
      value: { enabled: false, monthlyRatePct: 3.5 },
      isDefault: false,
    });

    const { user } = await renderSection();
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(updateSpy).toHaveBeenCalledWith('crm.stockHoldingCost', {
      enabled: false,
      monthlyRatePct: 3.5,
    });
  });
});
