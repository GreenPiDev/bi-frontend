import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CrmSettingsSection } from './crm-settings-section';
import { ToastProvider } from '../../components/ui/toast';
import * as api from '../../lib/api';

async function renderSection() {
  const queryClient = new QueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CrmSettingsSection />
      </ToastProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  for (const header of await screen.findAllByRole('button', { expanded: false })) {
    await user.click(header);
  }
  return result;
}

describe('CrmSettingsSection', () => {
  it('sektor yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    await renderSection();
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
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const createSpy = vi.spyOn(api, 'createSectorOption').mockResolvedValue({
      id: 's2',
      label: 'Tarım',
      createdAt: '2026-08-02T00:00:00.000Z',
    });

    const user = userEvent.setup();
    await renderSection();

    expect(await screen.findByText('Yazılım')).toBeInTheDocument();

    const sectorInput = screen.getByPlaceholderText('Yeni sektör adı');
    await user.type(sectorInput, 'Tarım');
    const sectorSection = within(sectorInput.parentElement!.parentElement!);
    await user.click(sectorSection.getByRole('button', { name: 'Ekle' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('Tarım'));
  });

  it('mevcut departmanlari listeler ve yenisini ekler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([
      { id: 'd1', label: 'Muhasebe', createdAt: '2026-08-01T00:00:00.000Z' },
    ]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const createSpy = vi.spyOn(api, 'createDepartmentOption').mockResolvedValue({
      id: 'd2',
      label: 'Satış',
      createdAt: '2026-08-02T00:00:00.000Z',
    });

    const user = userEvent.setup();
    await renderSection();

    expect(await screen.findByText('Muhasebe')).toBeInTheDocument();

    const departmentInput = screen.getByPlaceholderText('Yeni departman adı');
    await user.type(departmentInput, 'Satış');
    const departmentSection = within(departmentInput.parentElement!.parentElement!);
    await user.click(departmentSection.getByRole('button', { name: 'Ekle' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('Satış'));
  });

  it('mevcut bir sektoru duzenler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([
      { id: 's1', label: 'Yazılım', createdAt: '2026-08-01T00:00:00.000Z' },
    ]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const updateSpy = vi.spyOn(api, 'updateSectorOption').mockResolvedValue({
      id: 's1',
      label: 'Bilişim',
      createdAt: '2026-08-01T00:00:00.000Z',
    });

    const user = userEvent.setup();
    await renderSection();

    expect(await screen.findByText('Yazılım')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Düzenle' }));
    const editInput = screen.getByDisplayValue('Yazılım');
    await user.clear(editInput);
    await user.type(editInput, 'Bilişim');
    const editRow = within(editInput.closest('li')!);
    await user.click(editRow.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('s1', 'Bilişim'));
  });

  it('mevcut kategorileri listeler ve yenisini ekler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([
      { id: 'c1', label: 'Elektrik', createdAt: '2026-08-01T00:00:00.000Z' },
    ]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const createSpy = vi.spyOn(api, 'createProductCategoryOption').mockResolvedValue({
      id: 'c2',
      label: 'Mekanik',
      createdAt: '2026-08-02T00:00:00.000Z',
    });

    const user = userEvent.setup();
    await renderSection();

    expect(await screen.findByText('Elektrik')).toBeInTheDocument();

    const categoryInput = screen.getByPlaceholderText('Yeni kategori adı');
    await user.type(categoryInput, 'Mekanik');
    const categorySection = within(categoryInput.parentElement!.parentElement!);
    await user.click(categorySection.getByRole('button', { name: 'Ekle' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('Mekanik'));
  });

  it('esik degerini varsayilan olarak gosterir ve kaydetmeyi tetikler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.contactInactivityThresholdDays', value: 180, isDefault: true },
    ]);
    const updateSpy = vi.spyOn(api, 'updateTenantSetting').mockResolvedValue({
      key: 'crm.contactInactivityThresholdDays',
      value: 90,
      isDefault: false,
    });

    const user = userEvent.setup();
    await renderSection();

    const input = (await screen.findByLabelText('Eşik (gün)')) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('180'));

    await user.clear(input);
    await user.type(input, '90');
    const section = within(input.parentElement!.parentElement!);
    await user.click(section.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('crm.contactInactivityThresholdDays', 90),
    );
  });

  it('satis sonrasi hatirlatma esigini varsayilan olarak gosterir ve kaydetmeyi tetikler', async () => {
    vi.spyOn(api, 'listSectorOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listDepartmentOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTitleOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listProductCategoryOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([
      { key: 'crm.postSaleFollowUpDays', value: 14, isDefault: true },
    ]);
    const updateSpy = vi.spyOn(api, 'updateTenantSetting').mockResolvedValue({
      key: 'crm.postSaleFollowUpDays',
      value: 7,
      isDefault: false,
    });

    const user = userEvent.setup();
    await renderSection();

    const input = (await screen.findByLabelText('Hatırlatma süresi (gün)')) as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('14'));

    await user.clear(input);
    await user.type(input, '7');
    const section = within(input.parentElement!.parentElement!);
    await user.click(section.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('crm.postSaleFollowUpDays', 7));
  });
});
