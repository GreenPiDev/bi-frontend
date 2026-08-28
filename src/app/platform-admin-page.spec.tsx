import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminPage } from './platform-admin-page';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlatformAdminPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PlatformAdminPage', () => {
  it('AppShell icinde render edilir (header/sidebar kaybolmaz)', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@test.com',
      name: 'Admin Kisi',
      roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
      isPlatformAdmin: true,
      permissions: { isCompanyAdmin: true, permissions: [] },
    });
    vi.spyOn(api, 'getPlatformTenants').mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Kiracı Modül Yönetimi')).toBeInTheDocument();
    expect(await screen.findByText('Hoş geldin, Admin Kisi')).toBeInTheDocument();
  });
});
