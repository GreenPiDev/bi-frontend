import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardEditPage } from './dashboard-edit-page';
import * as api from '../lib/api';

function renderDashboardEditPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboards/db-1/edit']}>
        <Routes>
          <Route path="/dashboards/:id/edit" element={<DashboardEditPage />} />
          <Route path="/dashboards/:id" element={<div>view-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockDataset() {
  vi.spyOn(api, 'listDatasets').mockResolvedValue([
    {
      id: 'ds-1',
      name: 'Satış Verisi',
      rowCount: 10,
      lastIngestedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ]);
  vi.spyOn(api, 'getDataset').mockResolvedValue({
    id: 'ds-1',
    name: 'Satış Verisi',
    rowCount: 10,
    lastIngestedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    fields: [
      {
        id: 'f-1',
        datasetId: 'ds-1',
        sourceName: 'Tutar',
        name: 'tutar',
        label: 'Tutar',
        type: 'NUMBER',
        role: 'MEASURE',
        format: null,
        isVisible: true,
        ordinal: 0,
      },
    ],
  });
}

describe('DashboardEditPage', () => {
  it('yeni widget eklendiginde grid alanina eklenir ve kaydedilmemis degisiklik uyarisi cikar', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'editor@test.com',
      name: 'Editor',
      roles: [{ id: 'r1', name: 'Editor' }],
      isPlatformAdmin: false,
      permissions: { isCompanyAdmin: true, permissions: [] },
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
    mockDataset();
    vi.spyOn(api, 'createWidget').mockResolvedValue({
      id: 'w-1',
      dashboardId: 'db-1',
      type: 'kpi',
      title: 'Tutar',
      querySpec: {
        datasetId: 'ds-1',
        measures: [{ field: 'tutar', agg: 'sum', alias: 'toplam' }],
        dimensions: [],
        filters: [],
        orderBy: [],
      },
      vizOptions: {},
      position: { x: 0, y: 0, w: 4, h: 2 },
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    vi.spyOn(api, 'runQuery').mockResolvedValue({
      columns: [{ name: 'toplam', type: 'NUMBER', label: 'Toplam' }],
      rows: [[100]],
      rowCount: 1,
      executionMs: 1,
      truncated: false,
    });

    const user = userEvent.setup();
    renderDashboardEditPage();

    await screen.findByRole('option', { name: 'Satış Verisi' });
    await user.selectOptions(screen.getByLabelText('Veri kümesi'), 'ds-1');
    await screen.findByRole('option', { name: 'Tutar' });
    await user.selectOptions(screen.getByLabelText('Ne ölçmek istiyorsun?'), 'f-1');
    await user.click(screen.getByRole('button', { name: 'Widget ekle' }));

    expect(await screen.findByText('Kaydedilmemiş değişiklikler var.')).toBeInTheDocument();
    expect(api.createWidget).toHaveBeenCalledWith('db-1', {
      type: 'kpi',
      title: 'Tutar',
      querySpec: {
        datasetId: 'ds-1',
        measures: [{ field: 'tutar', agg: 'sum', alias: 'toplam' }],
        dimensions: [],
        filters: [],
        orderBy: [],
      },
      position: { x: 0, y: 0, w: 4, h: 2 },
    });
  });

  it('geri butonu goruntuleme sayfasina gider', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'editor@test.com',
      name: 'Editor',
      roles: [{ id: 'r1', name: 'Editor' }],
      isPlatformAdmin: false,
      permissions: { isCompanyAdmin: true, permissions: [] },
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
    vi.spyOn(api, 'listDatasets').mockResolvedValue([]);

    const user = userEvent.setup();
    renderDashboardEditPage();

    await user.click(await screen.findByRole('button', { name: /Görüntülemeye dön/ }));
    await waitFor(() => {
      expect(screen.getByText('view-page')).toBeInTheDocument();
    });
  });
});
