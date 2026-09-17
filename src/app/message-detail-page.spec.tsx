import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageDetailPage } from './message-detail-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

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
    vi.spyOn(api, 'me').mockResolvedValue(ME);
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-other', name: 'Diğer Kullanıcı' },
    ]);
    vi.spyOn(api, 'setConversationRead').mockResolvedValue(undefined);
    vi.spyOn(api, 'setConversationStar').mockResolvedValue(undefined);
  });

  it('tum mesajlar okunmussa "Okunmadı yap" butonu gorunur, tiklaninca setConversationRead(false) cagirir', async () => {
    vi.spyOn(api, 'getConversation').mockResolvedValue({
      conversationId: 'conv-1',
      relatedEntity: null,
      relatedEntityId: null,
      messages: [MESSAGE],
      starred: false,
    });
    const user = userEvent.setup();
    renderDetailPage();

    const markUnreadButton = await screen.findByRole('button', { name: 'Okunmadı yap' });
    await user.click(markUnreadButton);

    expect(api.setConversationRead).toHaveBeenCalledWith('conv-1', false);
  });

  it('okunmamis mesaj varsa "Okunmadı yap" butonu gorunmez ve otomatik okundu isaretlenir', async () => {
    vi.spyOn(api, 'getConversation').mockResolvedValue({
      conversationId: 'conv-1',
      relatedEntity: null,
      relatedEntityId: null,
      messages: [{ ...MESSAGE, recipients: [{ ...MESSAGE.recipients[0]!, readAt: null }] }],
      starred: false,
    });
    renderDetailPage();

    await screen.findByText(MESSAGE.subject);
    expect(screen.queryByRole('button', { name: 'Okunmadı yap' })).not.toBeInTheDocument();
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
});
