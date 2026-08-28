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

describe('PlatformAdminRoute', () => {
  it('platform-admin olmayan kullaniciyi / rotasina yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'a@test.com',
      name: 'A',
      roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
      isPlatformAdmin: false,
      permissions: { isCompanyAdmin: true, permissions: [] },
    });
    renderAppAt('/platform-admin');

    await waitFor(() => {
      expect(screen.queryByText('Kiracı Modül Yönetimi')).not.toBeInTheDocument();
    });
  });

  it('platform-admin kullanicisina sayfayi gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@test.com',
      name: 'Admin',
      roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
      isPlatformAdmin: true,
      permissions: { isCompanyAdmin: true, permissions: [] },
    });
    vi.spyOn(api, 'getPlatformTenants').mockResolvedValue([]);
    renderAppAt('/platform-admin');

    await waitFor(() => {
      expect(screen.getByText('Kiracı Modül Yönetimi')).toBeInTheDocument();
    });
  });
});
