import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesListPage } from './messages-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

/** MultiSelect'in etiketi <span> - <label htmlFor> degil, findByLabelText calismaz.
 * Bir secim yapilinca butonun icindeki metin de secilen etikete esit olabildigi icin
 * (`getByText` belirsizlesir), sadece MultiSelect'in kendi etiket span'ini class'indan
 * ayirt edip kapsayici div icindeki tetikleyici butonu doner. */
function multiSelectButton(labelText: string): HTMLElement {
  const label = screen
    .getAllByText(labelText)
    .find((el) => el.tagName === 'SPAN' && el.className.includes('font-semibold'));
  const container = label?.closest('div');
  if (!container) throw new Error(`MultiSelect container not found for "${labelText}"`);
  return within(container).getByRole('button');
}

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
      { id: 'user-1', name: 'Ali Veli', avatarUrl: null },
    ]);
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [
        {
          id: 'quote-1',
          quoteNumber: 'TEK-2026-01-01-001',
          account: { id: 'acc-1', name: 'ACME' },
        } as never,
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listProjects').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    vi.spyOn(api, 'listInteractions').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
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
          conversationId: 'conv-1',
          relatedEntity: null,
          relatedEntityId: null,
          relatedEntityLabel: null,
          messageCount: 1,
          unreadCount: 0,
          starred: false,
          lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            subject: 'Teklif hakkinda',
            body: 'Merhaba, teklif hakkinda konusalim.',
            sentAt: '2026-01-01T10:00:00.000Z',
            relatedEntity: null,
            relatedEntityId: null,
            recipients: [{ id: 'rec-1', userId: 'user-2', kind: 'TO', readAt: null }],
            attachments: [],
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
          },
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

  it('konusma bir kayda bagliysa Kayit kolonunda kayit turu ve adi gorunur, bagli degilse tire gorunur', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [
        {
          conversationId: 'conv-1',
          relatedEntity: 'QUOTE',
          relatedEntityId: 'quote-1',
          relatedEntityLabel: 'TEK-2026-01-01-001',
          messageCount: 1,
          unreadCount: 0,
          starred: false,
          lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            subject: 'Teklif hakkinda',
            body: 'Merhaba, teklif hakkinda konusalim.',
            sentAt: '2026-01-01T10:00:00.000Z',
            relatedEntity: 'QUOTE',
            relatedEntityId: 'quote-1',
            recipients: [{ id: 'rec-1', userId: 'user-2', kind: 'TO', readAt: null }],
            attachments: [],
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
          },
        },
        {
          conversationId: 'conv-2',
          relatedEntity: null,
          relatedEntityId: null,
          relatedEntityLabel: null,
          messageCount: 1,
          unreadCount: 0,
          starred: false,
          lastMessage: {
            id: 'msg-2',
            conversationId: 'conv-2',
            senderId: 'user-1',
            subject: 'Genel',
            body: 'Ilgisiz mesaj.',
            sentAt: '2026-01-02T10:00:00.000Z',
            relatedEntity: null,
            relatedEntityId: null,
            recipients: [{ id: 'rec-2', userId: 'user-2', kind: 'TO', readAt: null }],
            attachments: [],
            createdAt: '2026-01-02T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
          },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    });
    renderMessagesListPage();

    expect(await screen.findByText('Teklif · TEK-2026-01-01-001')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
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

  it('kime gonderildi filtresi secilince listMessages recipientUserId ile cagirilir', async () => {
    const listMessagesSpy = vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    await user.click(await screen.findByRole('button', { name: 'Filtrele' }));
    await user.selectOptions(await screen.findByLabelText('Kime Gönderildi'), 'user-1');

    expect(listMessagesSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ recipientUserId: 'user-1' }),
    );
  });

  it('ilişkili kayıt türü + teklif kompozit filtresi seçilince listMessages ilgili parametrelerle çağrılır', async () => {
    const listMessagesSpy = vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    await user.click(await screen.findByRole('button', { name: 'Filtrele' }));

    const relatedEntityButton = multiSelectButton('İlişkili Kayıt Türü');
    await user.click(relatedEntityButton);
    await user.click(await screen.findByRole('checkbox', { name: 'Teklif' }));
    await user.click(relatedEntityButton); // menuyu kapat - "Teklif" metni tekilleşsin

    await user.click(multiSelectButton('Teklif'));
    await user.click(await screen.findByRole('checkbox', { name: 'TEK-2026-01-01-001 — ACME' }));

    expect(listMessagesSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        relatedEntity: ['QUOTE'],
        quoteIds: ['quote-1'],
      }),
    );
  });

  it('satir checkboxlari ile secim yapinca toplu islem barı gorunur ve okundu/okunmadi isaretler', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [
        {
          conversationId: 'conv-1',
          relatedEntity: null,
          relatedEntityId: null,
          relatedEntityLabel: null,
          messageCount: 1,
          unreadCount: 1,
          starred: false,
          lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            subject: 'Birinci konu',
            body: 'Merhaba.',
            sentAt: '2026-01-01T10:00:00.000Z',
            relatedEntity: null,
            relatedEntityId: null,
            recipients: [{ id: 'rec-1', userId: 'user-2', kind: 'TO', readAt: null }],
            attachments: [],
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
          },
        },
        {
          conversationId: 'conv-2',
          relatedEntity: null,
          relatedEntityId: null,
          relatedEntityLabel: null,
          messageCount: 1,
          unreadCount: 0,
          starred: false,
          lastMessage: {
            id: 'msg-2',
            conversationId: 'conv-2',
            senderId: 'user-1',
            subject: 'Ikinci konu',
            body: 'Merhaba tekrar.',
            sentAt: '2026-01-02T10:00:00.000Z',
            relatedEntity: null,
            relatedEntityId: null,
            recipients: [
              { id: 'rec-2', userId: 'user-2', kind: 'TO', readAt: '2026-01-02T11:00:00.000Z' },
            ],
            attachments: [],
            createdAt: '2026-01-02T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
          },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    });
    const setConversationReadSpy = vi
      .spyOn(api, 'setConversationRead')
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderMessagesListPage();

    await screen.findByText('Birinci konu');
    expect(screen.queryByText('2 mesaj seçili')).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox', { name: 'Mesajı seç' });
    expect(checkboxes).toHaveLength(2);
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    expect(screen.getByText('2 mesaj seçili')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Okundu olarak işaretle' }));

    expect(setConversationReadSpy).toHaveBeenCalledWith('conv-1', true);
    expect(setConversationReadSpy).toHaveBeenCalledWith('conv-2', true);
    // Basarili toplu islemden sonra secim temizlenir.
    expect(screen.queryByText('2 mesaj seçili')).not.toBeInTheDocument();
  });

  it('sayfadaki tumunu sec checkboxu tum satirlari secer', async () => {
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [
        {
          conversationId: 'conv-1',
          relatedEntity: null,
          relatedEntityId: null,
          relatedEntityLabel: null,
          messageCount: 1,
          unreadCount: 0,
          starred: false,
          lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            subject: 'Birinci konu',
            body: 'Merhaba.',
            sentAt: '2026-01-01T10:00:00.000Z',
            relatedEntity: null,
            relatedEntityId: null,
            recipients: [{ id: 'rec-1', userId: 'user-2', kind: 'TO', readAt: null }],
            attachments: [],
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-01T10:00:00.000Z',
          },
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderMessagesListPage();

    await screen.findByText('Birinci konu');
    await user.click(screen.getByRole('checkbox', { name: 'Sayfadaki tüm mesajları seç' }));

    expect(screen.getByText('1 mesaj seçili')).toBeInTheDocument();
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
