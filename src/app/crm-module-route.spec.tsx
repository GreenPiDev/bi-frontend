import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../lib/api';

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

const baseUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'a@test.com',
  name: 'A',
  role: 'OWNER' as const,
  isPlatformAdmin: false,
};

describe('CrmModuleRoute', () => {
  it("'crm' modulu kapaliyken bilgi mesaji gosterir, firma listesini gostermez", async () => {
    vi.spyOn(api, 'me').mockResolvedValue(baseUser);
    vi.spyOn(api, 'getMyTenantModules').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true, enabled: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false, enabled: false },
    ]);
    renderAppAt('/firmalar');

    await waitFor(() => {
      expect(screen.getByText('CRM modülü kapalı')).toBeInTheDocument();
    });
    expect(screen.queryByText('Yeni Firma')).not.toBeInTheDocument();
  });

  it("'crm' modulu aciksa firma listesini gosterir", async () => {
    vi.spyOn(api, 'me').mockResolvedValue(baseUser);
    vi.spyOn(api, 'getMyTenantModules').mockResolvedValue([
      { key: 'core', label: 'Cekirdek', alwaysOn: true, enabled: true },
      { key: 'crm', label: 'Satis (CRM)', alwaysOn: false, enabled: true },
    ]);
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderAppAt('/firmalar');

    await waitFor(() => {
      expect(screen.getByText('Yeni Firma')).toBeInTheDocument();
    });
  });
});
