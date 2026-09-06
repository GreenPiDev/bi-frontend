import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminPageModules } from './platform-admin-page-modules';
import * as api from '../lib/api';

function renderComponent() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformAdminPageModules />
    </QueryClientProvider>,
  );
}

describe('PlatformAdminPageModules', () => {
  it('sayfalari ve atanmis modulleri listeler (bir sayfa birden fazla modulde olabilir)', async () => {
    vi.spyOn(api, 'getPlatformPageModules').mockResolvedValue([
      { pageKey: 'accounts', label: 'Firmalar', moduleKeys: ['crm', 'core'] },
      { pageKey: 'dashboards', label: 'Panolar', moduleKeys: [] },
    ]);
    vi.spyOn(api, 'getPlatformModuleDefinitions').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false },
    ]);

    renderComponent();

    expect(await screen.findByText('Firmalar')).toBeInTheDocument();
    expect(await screen.findByText('Panolar')).toBeInTheDocument();
    expect(await screen.findByText('Cekirdek, Satis (CRM)')).toBeInTheDocument();
  });

  it('modul secimi degistirilince mutation dogru pageKey ve moduleKeys ile tetiklenir', async () => {
    vi.spyOn(api, 'getPlatformPageModules').mockResolvedValue([
      { pageKey: 'dashboards', label: 'Panolar', moduleKeys: [] },
    ]);
    vi.spyOn(api, 'getPlatformModuleDefinitions').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false },
    ]);
    const setSpy = vi
      .spyOn(api, 'setPlatformPageModule')
      .mockResolvedValue([{ pageKey: 'dashboards', label: 'Panolar', moduleKeys: ['crm'] }]);

    renderComponent();

    const toggleButton = await screen.findByRole('button', { name: 'Modül gerekmez' });
    fireEvent.click(toggleButton);
    const crmCheckbox = await screen.findByRole('checkbox', { name: 'Satis (CRM)' });
    fireEvent.click(crmCheckbox);

    await waitFor(() => expect(setSpy).toHaveBeenCalledWith('dashboards', ['crm']));
  });
});
