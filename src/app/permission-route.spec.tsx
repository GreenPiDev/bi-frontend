import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../lib/api';
import type { AuthenticatedUser } from '../lib/api';

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

function noPermissionsUser(): AuthenticatedUser {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'viewer@test.com',
    name: 'Viewer',
    roles: [{ id: 'r1', name: 'Goruntuleyici' }],
    isPlatformAdmin: false,
    permissions: { isCompanyAdmin: false, permissions: [] },
  };
}

function companyAdminUser(): AuthenticatedUser {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'owner@test.com',
    name: 'Owner',
    roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
    isPlatformAdmin: false,
    permissions: { isCompanyAdmin: true, permissions: [] },
  };
}

describe('PermissionRoute', () => {
  it('settings VIEW izni olmayan kullaniciyi / rotasina yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(noPermissionsUser());
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderAppAt('/settings');

    await waitFor(() => {
      expect(screen.queryByText('Denetim Kaydı')).not.toBeInTheDocument();
    });
  });

  it('settings VIEW izni olan kullaniciya ayarlar sayfasini gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(companyAdminUser());
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([]);
    renderAppAt('/settings');

    await waitFor(() => {
      expect(screen.getByText('Denetim Kaydı')).toBeInTheDocument();
    });
  });

  it('dashboards UPDATE izni olmayan kullaniciyi pano goruntuleme sayfasina yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(noPermissionsUser());
    vi.spyOn(api, 'getDashboard').mockResolvedValue({
      id: 'd1',
      name: 'Test Panosu',
      description: null,
      layout: [],
      filters: [],
      createdById: 'u1',
      createdAt: '2026-08-28T00:00:00.000Z',
      widgets: [],
    });
    renderAppAt('/dashboards/d1/edit');

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboards/d1');
    });
  });
});
