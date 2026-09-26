import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardsListPage } from './dashboards-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function createMockUser(overrides: Partial<api.AuthenticatedUser> = {}): api.AuthenticatedUser {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'owner@test.com',
    name: 'Owner',
    roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
    isPlatformAdmin: false,
    avatarUrl: null,
    defaultPageSize: 25,
    columnPreferences: null,
    permissions: { isCompanyAdmin: true, permissions: [] },
    ...overrides,
  };
}

function renderDashboardsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/dashboards']}>
          <Routes>
            <Route path="/dashboards" element={<DashboardsListPage />} />
            <Route path="/dashboards/:id" element={<div>view-page</div>} />
            <Route path="/dashboards/edit/:id" element={<div>edit-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
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

  it('silme yetkisi yoksa aksiyon kolonu gorunmez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(
      createMockUser({ permissions: { isCompanyAdmin: false, permissions: [] } }),
    );
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
    const { container } = renderDashboardsListPage();

    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();
    expect(container.querySelector('table tbody button')).toBeNull();
  });

  it('sil butonu onay sonrasi panoyu siler ve listeyi yeniler', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(createMockUser());
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
    const deleteSpy = vi.spyOn(api, 'deleteDashboard').mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = renderDashboardsListPage();

    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();
    const deleteButton = container.querySelector('table tbody button');
    expect(deleteButton).not.toBeNull();
    await user.click(deleteButton as HTMLButtonElement);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }));

    expect(deleteSpy).toHaveBeenCalledWith('db-1');
    expect(await screen.findByText('Pano silindi.')).toBeInTheDocument();
  });
});
