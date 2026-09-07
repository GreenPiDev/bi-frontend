import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../lib/api';
import { createMockUser } from '../test/mock-user';

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

const platformAdminUser = createMockUser({
  email: 'superadmin@test.com',
  name: 'Super Admin',
  isPlatformAdmin: true,
});

describe('ProtectedRoute - platform-admin erisim kisitlamasi', () => {
  it('superadmin /dashboards URLine elle gitse bile tenant panolarini gostermez, platform-admine yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(platformAdminUser);
    vi.spyOn(api, 'getPlatformTenants').mockResolvedValue([]);
    renderAppAt('/dashboards');

    await waitFor(() => {
      expect(screen.getByText('Kiracı Modül Yönetimi')).toBeInTheDocument();
    });
  });

  it('superadmin kok / rotasina gidince dashboards degil platform-admine duser', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(platformAdminUser);
    vi.spyOn(api, 'getPlatformTenants').mockResolvedValue([]);
    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByText('Kiracı Modül Yönetimi')).toBeInTheDocument();
    });
  });

  it('normal tenant kullanicisi kok / rotasinda dashboards sayfasina duser', async () => {
    const tenantUser = createMockUser({ isPlatformAdmin: false });
    vi.spyOn(api, 'me').mockResolvedValue(tenantUser);
    vi.spyOn(api, 'getMyPageAccess').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderAppAt('/');

    await waitFor(() => {
      expect(screen.getByText('Yeni Pano')).toBeInTheDocument();
    });
  });

  it('superadmin /profile sayfasina erisebilir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(platformAdminUser);
    vi.spyOn(api, 'getProfile').mockResolvedValue({
      ...platformAdminUser,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    renderAppAt('/profile');

    await waitFor(() => {
      expect(screen.queryByText('Kiracı Modül Yönetimi')).not.toBeInTheDocument();
    });
  });
});
