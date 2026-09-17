import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageDetailPage } from './message-detail-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

/** MultiSelect'in etiketi <span> - <label htmlFor> degil, findByLabelText calismaz. */
function multiSelectButton(labelText: string): HTMLElement {
  const label = screen
    .getAllByText(labelText)
    .find((el) => el.tagName === 'SPAN' && el.className.includes('font-semibold'));
  const container = label?.closest('div');
  if (!container) throw new Error(`MultiSelect container not found for "${labelText}"`);
  return within(container).getByRole('button');
}

const ME: api.AuthenticatedUser = {
  id: 'user-me',
  tenantId: 'tenant-a',
  email: 'me@example.com',
  name: 'Ben',
  roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
  isPlatformAdmin: false,
  avatarUrl: null,
  defaultPageSize: 25,
  columnPreferences: null,
  permissions: { isCompanyAdmin: true, permissions: [] },
};

const MESSAGE = {
  id: 'msg-1',
  conversationId: 'conv-1',
  senderId: 'user-other',
  subject: 'Teklif hakkinda',
  body: 'Merhaba, teklifi inceledin mi?',
  sentAt: '2026-01-01T10:00:00.000Z',
  relatedEntity: null,
  relatedEntityId: null,
  recipients: [{ id: 'rec-1', userId: 'user-me', kind: 'TO', readAt: '2026-01-01T11:00:00.000Z' }],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
} satisfies api.Message;

function renderDetailPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/mesajlar/conv-1']}>
          <Routes>
            <Route path="/mesajlar/:id" element={<MessageDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('MessageDetailPage', () => {
  beforeEach(() => {
    // vi.spyOn ayni metodu tekrar spy'lariken cagri gecmisini sifirlamiyor - testler
    // arasi sizinti (ornegin bir onceki testin createMessage cagrisi) bir sonraki
    // testin `not.toHaveBeenCalled()` beklentisini bozabiliyor.
    vi.clearAllMocks();
    vi.spyOn(api, 'me').mockResolvedValue(ME);
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-other', name: 'Diğer Kullanıcı' },
    ]);
    vi.spyOn(api, 'setConversationRead').mockResolvedValue(undefined);
    vi.spyOn(api, 'setConversationStar').mockResolvedValue(undefined);
  });

  it('okunmamis mesaj varsa otomatik okundu isaretlenir', async () => {
    vi.spyOn(api, 'getConversation').mockResolvedValue({
      conversationId: 'conv-1',
      relatedEntity: null,
      relatedEntityId: null,
      messages: [{ ...MESSAGE, recipients: [{ ...MESSAGE.recipients[0]!, readAt: null }] }],
      starred: false,
    });
    renderDetailPage();

    await screen.findByText(MESSAGE.subject);
    expect(api.setConversationRead).toHaveBeenCalledWith('conv-1', true);
  });

  it('yildiz ikonuna tiklayinca setConversationStar cagirir', async () => {
    vi.spyOn(api, 'getConversation').mockResolvedValue({
      conversationId: 'conv-1',
      relatedEntity: null,
      relatedEntityId: null,
      messages: [MESSAGE],
      starred: false,
    });
    const user = userEvent.setup();
    renderDetailPage();

    const starButton = await screen.findByRole('button', { name: 'Yıldızla' });
    await user.click(starButton);

    expect(api.setConversationStar).toHaveBeenCalledWith('conv-1', true);
  });

  it('konusma zaten yildizliysa "Yıldızı kaldır" gorunur', async () => {
    vi.spyOn(api, 'getConversation').mockResolvedValue({
      conversationId: 'conv-1',
      relatedEntity: null,
      relatedEntityId: null,
      messages: [MESSAGE],
      starred: true,
    });
    renderDetailPage();

    expect(await screen.findByRole('button', { name: 'Yıldızı kaldır' })).toBeInTheDocument();
  });

  describe('Yanitla / Tumune Yanitla', () => {
    const MESSAGE_TWO_PARTICIPANTS = {
      ...MESSAGE,
      senderId: 'user-a',
      recipients: [
        { id: 'rec-1', userId: 'user-me', kind: 'TO' as const, readAt: '2026-01-01T11:00:00.000Z' },
        { id: 'rec-2', userId: 'user-b', kind: 'CC' as const, readAt: '2026-01-01T11:00:00.000Z' },
      ],
    } satisfies api.Message;

    beforeEach(() => {
      vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
        { id: 'user-a', name: 'Ayşe' },
        { id: 'user-b', name: 'Burak' },
      ]);
      vi.spyOn(api, 'getConversation').mockResolvedValue({
        conversationId: 'conv-1',
        relatedEntity: null,
        relatedEntityId: null,
        messages: [MESSAGE_TWO_PARTICIPANTS],
        starred: false,
      });
      vi.spyOn(api, 'createMessage').mockResolvedValue({
        ...MESSAGE_TWO_PARTICIPANTS,
        id: 'msg-2',
      });
    });

    it('Yanıtla sadece son mesajın göndereni ile formu açar', async () => {
      const user = userEvent.setup();
      renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Yanıtla' }));

      expect(multiSelectButton('Kime').textContent).toContain('Ayşe');
      expect(multiSelectButton('Kime').textContent).not.toContain('Burak');
      // Yeni konusma degil - konu alani gorunmez.
      expect(screen.queryByLabelText(/^Konu\*?$/)).not.toBeInTheDocument();
    });

    it('Tümüne Yanıtla konusmadaki tüm katılımcılarla formu açar', async () => {
      const user = userEvent.setup();
      renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Tümüne Yanıtla' }));

      const toButtonText = multiSelectButton('Kime').textContent ?? '';
      expect(toButtonText).toContain('Ayşe');
      expect(toButtonText).toContain('Burak');
    });

    it('"Yeni konuşma olarak oluştur" isaretlenmeden gonderilince conversationId ile ayni konusmaya eklenir', async () => {
      const user = userEvent.setup();
      renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Yanıtla' }));
      await user.type(await screen.findByLabelText(/^Mesaj\*?$/), 'Tamamdır, bakıyorum.');
      await user.click(screen.getByRole('button', { name: 'Gönder' }));

      expect(api.createMessage).toHaveBeenCalledWith({
        body: 'Tamamdır, bakıyorum.',
        toUserIds: ['user-a'],
        ccUserIds: [],
        conversationId: 'conv-1',
      });
    });

    it('"Yeni konuşma olarak oluştur" isaretlenince konu alani gorunur ve zorunlu olur', async () => {
      const user = userEvent.setup();
      renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Yanıtla' }));
      await user.click(
        await screen.findByRole('checkbox', { name: 'Yeni konuşma olarak oluştur' }),
      );

      expect(await screen.findByLabelText(/^Konu\*?$/)).toBeInTheDocument();

      await user.type(screen.getByLabelText(/^Mesaj\*?$/), 'Yeni bir konu hakkında.');
      await user.click(screen.getByRole('button', { name: 'Gönder' }));

      expect(await screen.findByText('Konu gereklidir.')).toBeInTheDocument();
      expect(api.createMessage).not.toHaveBeenCalled();

      await user.type(screen.getByLabelText(/^Konu\*?$/), 'Yeni Konu');
      await user.click(screen.getByRole('button', { name: 'Gönder' }));

      expect(api.createMessage).toHaveBeenCalledWith({
        body: 'Yeni bir konu hakkında.',
        toUserIds: ['user-a'],
        ccUserIds: [],
        subject: 'Yeni Konu',
        relatedEntity: undefined,
        relatedEntityId: undefined,
      });
    });
  });
});
