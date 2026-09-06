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
  it('sayfalari satir, modulleri kolon olarak listeler; atanmis kesisimlerde switch acik gorunur', async () => {
    vi.spyOn(api, 'getPlatformPageModules').mockResolvedValue([
      { pageKey: 'accounts', label: 'Firmalar', moduleKeys: ['crm'] },
      { pageKey: 'dashboards', label: 'Panolar', moduleKeys: [] },
    ]);
    vi.spyOn(api, 'getPlatformModuleDefinitions').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false },
    ]);

    renderComponent();

    expect(await screen.findByText('Firmalar')).toBeInTheDocument();
    expect(await screen.findByText('Panolar')).toBeInTheDocument();
    expect(await screen.findByText('Cekirdek')).toBeInTheDocument();
    expect(await screen.findByText('Satis (CRM)')).toBeInTheDocument();

    const firmalarCrmSwitch = await screen.findByRole('switch', {
      name: 'Firmalar - Satis (CRM)',
    });
    expect(firmalarCrmSwitch).toHaveAttribute('aria-checked', 'true');

    const panolarCrmSwitch = await screen.findByRole('switch', {
      name: 'Panolar - Satis (CRM)',
    });
    expect(panolarCrmSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('bir hucredeki switch tiklaninca mutation dogru pageKey ve guncellenmis moduleKeys ile tetiklenir', async () => {
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

    const panolarCrmSwitch = await screen.findByRole('switch', {
      name: 'Panolar - Satis (CRM)',
    });
    fireEvent.click(panolarCrmSwitch);

    await waitFor(() => expect(setSpy).toHaveBeenCalledWith('dashboards', ['crm']));
  });

  it('acik bir modul tekrar tiklaninca listeden cikarilir', async () => {
    vi.spyOn(api, 'getPlatformPageModules').mockResolvedValue([
      { pageKey: 'accounts', label: 'Firmalar', moduleKeys: ['crm', 'core'] },
    ]);
    vi.spyOn(api, 'getPlatformModuleDefinitions').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false },
    ]);
    const setSpy = vi
      .spyOn(api, 'setPlatformPageModule')
      .mockResolvedValue([{ pageKey: 'accounts', label: 'Firmalar', moduleKeys: ['core'] }]);

    renderComponent();

    const firmalarCrmSwitch = await screen.findByRole('switch', {
      name: 'Firmalar - Satis (CRM)',
    });
    fireEvent.click(firmalarCrmSwitch);

    await waitFor(() => expect(setSpy).toHaveBeenCalledWith('accounts', ['core']));
  });
});
