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

describe('AdminRoute', () => {
  it('VIEWER kullanicisini / rotasina yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'viewer@test.com',
      name: 'Viewer',
      role: 'VIEWER',
      isPlatformAdmin: false,
    });
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderAppAt('/settings');

    await waitFor(() => {
      expect(screen.queryByText('Denetim Kaydı')).not.toBeInTheDocument();
    });
  });

  it('OWNER kullanicisina ayarlar sayfasini gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'owner@test.com',
      name: 'Owner',
      role: 'OWNER',
      isPlatformAdmin: false,
    });
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([]);
    renderAppAt('/settings');

    await waitFor(() => {
      expect(screen.getByText('Denetim Kaydı')).toBeInTheDocument();
    });
  });
});
