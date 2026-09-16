import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountsListPage } from './accounts-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';
import { createMockUser } from '../test/mock-user';

function renderAccountsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/firmalar']}>
          <Routes>
            <Route path="/firmalar" element={<AccountsListPage />} />
            <Route path="/firmalar/yeni" element={<div>new-page</div>} />
            <Route path="/firmalar/:id" element={<div>detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
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
          landlinePhone: null,
          district: null,
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

  it('islemler kolonundaki duzenle ikonu duzenleme sayfasina gider', async () => {
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
          landlinePhone: null,
          district: null,
          ownerId: null,
          missingCriticalFields: [],
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/firmalar']}>
            <Routes>
              <Route path="/firmalar" element={<AccountsListPage />} />
              <Route path="/firmalar/duzenle/:id" element={<div>edit-page</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Acme A.S.')).toBeInTheDocument();
    const actionButtons = container.querySelectorAll('table tbody button');
    expect(actionButtons).toHaveLength(2);
    await user.click(actionButtons[0]);
    expect(await screen.findByText('edit-page')).toBeInTheDocument();
  });

  it('islemler kolonundaki sil ikonu onay sonrasi firmayi siler', async () => {
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
          landlinePhone: null,
          district: null,
          ownerId: null,
          missingCriticalFields: [],
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const deleteSpy = vi.spyOn(api, 'deleteAccount').mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = renderAccountsListPage();

    expect(await screen.findByText('Acme A.S.')).toBeInTheDocument();
    const actionButtons = container.querySelectorAll('table tbody button');
    await user.click(actionButtons[1]);
    await user.click(await screen.findByRole('button', { name: 'Sil' }));
    expect(deleteSpy).toHaveBeenCalledWith('acc-1');
  });

  it('gosterilecek kolonlar secicisinden bir kolon kaldirilinca tablodan gizlenir ve tercih kaydedilir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(createMockUser());
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
          landlinePhone: null,
          district: null,
          ownerId: null,
          missingCriticalFields: [],
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const updateProfileSpy = vi
      .spyOn(api, 'updateProfile')
      .mockImplementation((input) =>
        Promise.resolve({ ...createMockUser(), ...input } as unknown as api.UserProfile),
      );
    const user = userEvent.setup();
    renderAccountsListPage();

    expect(await screen.findByText('Istanbul')).toBeInTheDocument();
    const pickerContainer = screen.getByText('Gösterilecek Kolonlar').closest('div');
    expect(pickerContainer).not.toBeNull();
    await user.click(within(pickerContainer as HTMLElement).getByRole('button'));
    await user.click(screen.getByRole('checkbox', { name: 'Şehir' }));

    expect(updateProfileSpy).toHaveBeenCalledWith({
      columnPreferences: { accounts: ['phone', 'email', 'sector', 'accountTypes'] },
    });
    expect(screen.queryByText('Istanbul')).not.toBeInTheDocument();
  });
});
