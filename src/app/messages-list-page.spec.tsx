import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesListPage } from './messages-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderMessagesListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/mesajlar']}>
          <Routes>
            <Route path="/mesajlar" element={<MessagesListPage />} />
            <Route path="/mesajlar/:id" element={<div>detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('MessagesListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-1', name: 'Ali Veli' },
    ]);
  });

  it('mesaj yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderMessagesListPage();

    expect(await screen.findByText('Henüz mesaj yok.')).toBeInTheDocument();
  });

  it('mesajlari listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          senderId: 'user-1',
          body: 'Merhaba, teklif hakkinda konusalim.',
          sentAt: '2026-01-01T10:00:00.000Z',
          relatedEntity: null,
          relatedEntityId: null,
          recipients: [{ id: 'rec-1', userId: 'user-2', kind: 'TO', readAt: null }],
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    expect(await screen.findByText('Ali Veli')).toBeInTheDocument();
    await user.click(screen.getByText('Ali Veli'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('filtre butonuna tiklayinca cekmece acilir', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    await user.click(await screen.findByRole('button', { name: 'Filtrele' }));
    expect(screen.getByRole('dialog', { name: 'Mesajları Filtrele' })).toBeInTheDocument();
  });

  it('yeni mesaj butonu formu acar', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    await user.click(await screen.findByRole('button', { name: 'Yeni Mesaj' }));
    expect(screen.getByRole('dialog', { name: 'Yeni Mesaj' })).toBeInTheDocument();
  });
});
