import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountsListPage } from './accounts-list-page';
import * as api from '../lib/api';

function renderAccountsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/firmalar']}>
        <Routes>
          <Route path="/firmalar" element={<AccountsListPage />} />
          <Route path="/firmalar/yeni" element={<div>new-page</div>} />
          <Route path="/firmalar/:id" element={<div>detail-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AccountsListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('firma yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderAccountsListPage();

    expect(
      await screen.findByText(
        "Henüz firma yok. Excel/CSV'den içe aktarın veya yeni firma ekleyin.",
      ),
    ).toBeInTheDocument();
  });

  it('firmalari listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [
        {
          id: 'acc-1',
          name: 'Acme A.S.',
          taxNumber: null,
          taxOffice: null,
          sector: null,
          accountTypes: [],
          website: null,
          phone: null,
          email: null,
          address: null,
          city: 'Istanbul',
          ownerId: null,
          missingCriticalFields: [],
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderAccountsListPage();

    expect(await screen.findByText('Acme A.S.')).toBeInTheDocument();
    await user.click(screen.getByText('Acme A.S.'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('yeni firma butonu forma gider', async () => {
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderAccountsListPage();

    await user.click(await screen.findByRole('button', { name: 'Yeni Firma' }));
    expect(await screen.findByText('new-page')).toBeInTheDocument();
  });
});
