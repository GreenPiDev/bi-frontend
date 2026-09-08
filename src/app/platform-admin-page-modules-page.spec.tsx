import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminPageModulesPage } from './platform-admin-page-modules-page';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlatformAdminPageModulesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PlatformAdminPageModulesPage', () => {
  it('AppShell icinde render edilir ve baslik gorunur', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@test.com',
      name: 'Admin Kisi',
      roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
      isPlatformAdmin: true,
      avatarUrl: null,
      permissions: { isCompanyAdmin: true, permissions: [] },
    });
    vi.spyOn(api, 'getPlatformPageModules').mockResolvedValue([]);
    vi.spyOn(api, 'getPlatformModuleDefinitions').mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Sayfa-Modül Eşlemesi' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Hoş geldin, Admin Kisi')).toBeInTheDocument();
  });
});
