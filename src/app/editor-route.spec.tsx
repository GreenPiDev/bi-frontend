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

function mockDashboard() {
  vi.spyOn(api, 'getDashboard').mockResolvedValue({
    id: 'db-1',
    name: 'Satış Panosu',
    description: null,
    layout: [],
    filters: [],
    createdById: 'u1',
    createdAt: '2026-08-01T00:00:00.000Z',
    widgets: [],
  });
}

describe('EditorRoute', () => {
  it('VIEWER rolundeki kullaniciyi goruntuleme sayfasina yonlendirir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'viewer@test.com',
      name: 'Viewer',
      role: 'VIEWER',
      isPlatformAdmin: false,
    });
    mockDashboard();
    renderAppAt('/dashboards/db-1/edit');

    await waitFor(() => {
      expect(screen.queryByLabelText('Veri kümesi')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();
  });

  it('EDITOR rolundeki kullaniciya duzenleme sayfasini gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'editor@test.com',
      name: 'Editor',
      role: 'EDITOR',
      isPlatformAdmin: false,
    });
    mockDashboard();
    vi.spyOn(api, 'listDatasets').mockResolvedValue([]);
    renderAppAt('/dashboards/db-1/edit');

    expect(await screen.findByLabelText('Veri kümesi')).toBeInTheDocument();
  });
});
