import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardViewPage } from './dashboard-view-page';
import * as api from '../lib/api';

function renderDashboardViewPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboards/db-1']}>
        <Routes>
          <Route path="/dashboards/:id" element={<DashboardViewPage />} />
          <Route path="/dashboards/:id/edit" element={<div>edit-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardViewPage', () => {
  it('widget yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
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

    renderDashboardViewPage();

    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();
    expect(
      await screen.findByText('Bu pano henüz boş. Düzenleme moduna geçip widget ekleyebilirsin.'),
    ).toBeInTheDocument();
  });

  it('EDITOR rolune duzenle butonu gosterir, VIEWER rolune gostermez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'viewer@test.com',
      name: 'Viewer',
      role: 'VIEWER',
      isPlatformAdmin: false,
    });
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

    renderDashboardViewPage();

    await screen.findByText('Satış Panosu');
    expect(screen.queryByRole('button', { name: 'Düzenle' })).not.toBeInTheDocument();
  });
});
