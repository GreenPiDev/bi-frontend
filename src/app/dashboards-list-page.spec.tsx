import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardsListPage } from './dashboards-list-page';
import * as api from '../lib/api';

function renderDashboardsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboards']}>
        <Routes>
          <Route path="/dashboards" element={<DashboardsListPage />} />
          <Route path="/dashboards/:id" element={<div>view-page</div>} />
          <Route path="/dashboards/:id/edit" element={<div>edit-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardsListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('pano yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderDashboardsListPage();

    expect(
      await screen.findByText('Henüz panon yok. Başlamak için ilk panonu oluştur.'),
    ).toBeInTheDocument();
  });

  it('panolari listeler ve satira tiklayinca goruntulemeye gider', async () => {
    vi.spyOn(api, 'listDashboards').mockResolvedValue([
      {
        id: 'db-1',
        name: 'Satış Panosu',
        description: null,
        layout: [],
        filters: [],
        createdById: 'u1',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const user = userEvent.setup();
    renderDashboardsListPage();

    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();

    await user.click(screen.getByText('Satış Panosu'));
    expect(await screen.findByText('view-page')).toBeInTheDocument();
  });

  it('yeni pano olusturunca duzenleme sayfasina gider', async () => {
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    vi.spyOn(api, 'createDashboard').mockResolvedValue({
      id: 'db-2',
      name: 'Yeni Pano',
      description: null,
      layout: [],
      filters: [],
      createdById: 'u1',
      createdAt: '2026-08-01T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderDashboardsListPage();

    await user.click(await screen.findByRole('button', { name: 'Yeni Pano' }));
    await user.type(screen.getByLabelText('Pano adı'), 'Yeni Pano');
    await user.click(screen.getByRole('button', { name: 'Oluştur' }));

    expect(await screen.findByText('edit-page')).toBeInTheDocument();
  });
});
