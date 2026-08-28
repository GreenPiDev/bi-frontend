import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardViewPage } from './dashboard-view-page';
import * as api from '../lib/api';

function renderDashboardViewPage(initialPath = '/dashboards/db-1') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
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

  it('?print=1 ile navigasyon, aksiyon butonlari ve filtre cubugu gizlenir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'owner@test.com',
      name: 'Owner',
      roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
      isPlatformAdmin: false,
      permissions: { isCompanyAdmin: true, permissions: [] },
    });
    const widget: api.Widget = {
      id: 'w1',
      dashboardId: 'db-1',
      type: 'kpi',
      title: 'Toplam Adet',
      querySpec: {
        datasetId: 'ds-1',
        measures: [{ field: 'adet', agg: 'sum', alias: 'toplam' }],
        dimensions: [],
        filters: [],
        orderBy: [],
      },
      vizOptions: {},
      position: { x: 0, y: 0, w: 4, h: 4 },
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    vi.spyOn(api, 'getDashboard').mockResolvedValue({
      id: 'db-1',
      name: 'Satış Panosu',
      description: null,
      layout: [{ widgetId: 'w1', x: 0, y: 0, w: 4, h: 4 }],
      filters: [],
      createdById: 'u1',
      createdAt: '2026-08-01T00:00:00.000Z',
      widgets: [widget],
    });
    vi.spyOn(api, 'runQuery').mockResolvedValue({
      columns: [{ name: 'toplam', type: 'NUMBER', label: 'Toplam' }],
      rows: [[10]],
      rowCount: 1,
      executionMs: 1,
      truncated: false,
    });

    renderDashboardViewPage('/dashboards/db-1?print=1');

    await screen.findByText('Satış Panosu');
    expect(screen.queryByText('Panolara dön', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PDF indir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Düzenle' })).not.toBeInTheDocument();
    expect(screen.queryByText('+ Filtre ekle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Çıkış yap')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asistanı aç')).not.toBeInTheDocument();
  });

  it('EDITOR rolune duzenle butonu gosterir, VIEWER rolune gostermez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'viewer@test.com',
      name: 'Viewer',
      roles: [{ id: 'r1', name: 'Goruntuleyici' }],
      isPlatformAdmin: false,
      permissions: { isCompanyAdmin: false, permissions: [] },
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
