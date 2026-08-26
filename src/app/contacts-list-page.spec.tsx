import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactsListPage } from './contacts-list-page';
import * as api from '../lib/api';

function renderContactsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/kisiler']}>
        <Routes>
          <Route path="/kisiler" element={<ContactsListPage />} />
          <Route path="/kisiler/yeni" element={<div>new-page</div>} />
          <Route path="/kisiler/:id" element={<div>detail-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ContactsListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('kisi yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listContacts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderContactsListPage();

    expect(
      await screen.findByText("Henüz kişi yok. Excel/CSV'den içe aktarın veya yeni kişi ekleyin."),
    ).toBeInTheDocument();
  });

  it('kisileri listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listContacts').mockResolvedValue({
      data: [
        {
          id: 'c-1',
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          accountId: null,
          account: null,
          title: null,
          email: null,
          phone: null,
          ownerId: null,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderContactsListPage();

    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    await user.click(screen.getByText('Ayşe Yılmaz'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });
});
