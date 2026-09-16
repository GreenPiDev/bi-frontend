import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactsListPage } from './contacts-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderContactsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/kisiler']}>
          <Routes>
            <Route path="/kisiler" element={<ContactsListPage />} />
            <Route path="/kisiler/yeni" element={<div>new-page</div>} />
            <Route path="/kisiler/:id" element={<div>detail-page</div>} />
            <Route path="/kisiler/duzenle/:id" element={<div>edit-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const sampleContact = {
  id: 'c-1',
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  accountId: null,
  account: null,
  department: null,
  title: null,
  email: null,
  phone: null,
  extension: null,
  ownerId: null,
  status: 'ACTIVE' as const,
  lastContactedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

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
      data: [sampleContact],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderContactsListPage();

    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    await user.click(screen.getByText('Ayşe Yılmaz'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('islemler kolonundaki duzenle ikonu duzenleme sayfasina gider', async () => {
    vi.spyOn(api, 'listContacts').mockResolvedValue({
      data: [sampleContact],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    const { container } = renderContactsListPage();

    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    const actionButtons = container.querySelectorAll('table tbody button');
    expect(actionButtons).toHaveLength(2);
    await user.click(actionButtons[0]);
    expect(await screen.findByText('edit-page')).toBeInTheDocument();
  });

  it('islemler kolonundaki sil ikonu onay sonrasi kisiyi siler', async () => {
    vi.spyOn(api, 'listContacts').mockResolvedValue({
      data: [sampleContact],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const deleteSpy = vi.spyOn(api, 'deleteContact').mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = renderContactsListPage();

    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    const actionButtons = container.querySelectorAll('table tbody button');
    await user.click(actionButtons[1]);
    await user.click(await screen.findByRole('button', { name: 'Sil' }));
    expect(deleteSpy).toHaveBeenCalledWith('c-1');
  });
});
