import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CrmSettingsSection } from './crm-settings-section';
import { ToastProvider } from '../../components/ui/toast';
import * as api from '../../lib/api';

function renderSection() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CrmSettingsSection />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('CrmSettingsSection', () => {
  it('sektor yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    renderSection();
    expect(
      await screen.findByText(
        'Henüz sektör tanımlanmadı. Firma formunda serbest metin kabul edilir.',
      ),
    ).toBeInTheDocument();
  });

  it('mevcut sektorleri listeler ve yenisini ekler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([
      { id: 's1', label: 'Yazılım', createdAt: '2026-08-01T00:00:00.000Z' },
    ]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const createSpy = vi.spyOn(api, 'createSectorOption').mockResolvedValue({
      id: 's2',
      label: 'Tarım',
      createdAt: '2026-08-02T00:00:00.000Z',
    });

    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText('Yazılım')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Yeni sektör adı'), 'Tarım');
    await user.click(screen.getByRole('button', { name: 'Ekle' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('Tarım'));
  });

  it('esik degerini varsayilan olarak gosterir ve kaydetmeyi tetikler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const updateSpy = vi.spyOn(api, 'updateTenantSetting').mockResolvedValue({
      key: 'crm.contactInactivityThresholdDays',
      value: 90,
      isDefault: false,
    });

    const user = userEvent.setup();
    renderSection();

    const input = (await screen.findByLabelText('Eşik (gün)')) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('180'));

    await user.clear(input);
    await user.type(input, '90');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('crm.contactInactivityThresholdDays', 90),
    );
  });
});
