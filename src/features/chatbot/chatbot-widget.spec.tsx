import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import { ToastProvider } from '../../components/ui/toast';
import { ChatbotWidget } from './chatbot-widget';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const USER_A: api.AuthenticatedUser = {
  id: 'user-a',
  tenantId: 'tenant-a',
  email: 'a@example.com',
  name: 'Kullanici A',
  roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
  isPlatformAdmin: false,
  isActive: true,
  avatarUrl: null,
  title: null,
  phone: null,
  defaultPageSize: 25,
  columnPreferences: null,
  permissions: { isCompanyAdmin: true, permissions: [] },
};

function renderWidget() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/dashboards']}>
          <ChatbotWidget />
          <LocationDisplay />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ChatbotWidget', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockResolvedValue(USER_A);
    vi.spyOn(api, 'listChatConversations').mockResolvedValue([]);
  });

  it('varsayilan olarak kapali durumdadir, butona tiklayinca acilir ve konusma listesini gosterir', async () => {
    const user = userEvent.setup();
    renderWidget();

    expect(screen.queryByText('PiLens Asistanı')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    expect(screen.getByText('PiLens Asistanı')).toBeInTheDocument();
    expect(await screen.findByText(/Henüz bir konuşmanız yok/)).toBeInTheDocument();
  });

  it('yeni konusma olusturup mesaj gonderip cevabi balon olarak gosterir', async () => {
    vi.spyOn(api, 'createChatConversation').mockResolvedValue({
      id: 'c1',
      title: null,
      updatedAt: new Date().toISOString(),
    });
    vi.spyOn(api, 'getChatConversation').mockResolvedValue({ id: 'c1', title: null, messages: [] });
    vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      reply: 'Toplam satışınız 1.000 TL.',
      navigateTo: null,
      title: 'toplam satis ne kadar?',
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));
    await user.click(screen.getByRole('button', { name: 'Yeni Konuşma' }));

    await user.type(
      await screen.findByPlaceholderText('Bir soru sorun...'),
      'toplam satis ne kadar?',
    );
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    expect(await screen.findByText('Toplam satışınız 1.000 TL.')).toBeInTheDocument();
    expect(screen.getByText('toplam satis ne kadar?')).toBeInTheDocument();
    expect(api.sendChatMessage).toHaveBeenCalledWith(
      { conversationId: 'c1', message: 'toplam satis ne kadar?' },
      expect.anything(),
    );
  });

  it('navigateTo donerse ilgili sayfaya yonlendirir', async () => {
    vi.spyOn(api, 'createChatConversation').mockResolvedValue({
      id: 'c1',
      title: null,
      updatedAt: new Date().toISOString(),
    });
    vi.spyOn(api, 'getChatConversation').mockResolvedValue({ id: 'c1', title: null, messages: [] });
    vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      reply: 'Panolara yönlendiriyorum.',
      navigateTo: '/datasets',
      title: null,
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));
    await user.click(screen.getByRole('button', { name: 'Yeni Konuşma' }));

    await user.type(await screen.findByPlaceholderText('Bir soru sorun...'), 'veri kumelerine git');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/datasets');
    });
  });

  it('hata durumunda kullaniciya hata mesaji gosterir', async () => {
    vi.spyOn(api, 'createChatConversation').mockResolvedValue({
      id: 'c1',
      title: null,
      updatedAt: new Date().toISOString(),
    });
    vi.spyOn(api, 'getChatConversation').mockResolvedValue({ id: 'c1', title: null, messages: [] });
    vi.spyOn(api, 'sendChatMessage').mockRejectedValue(
      new api.ApiError('UNKNOWN_ERROR', 'sunucu hatasi', 500),
    );
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));
    await user.click(screen.getByRole('button', { name: 'Yeni Konuşma' }));

    await user.type(await screen.findByPlaceholderText('Bir soru sorun...'), 'merhaba');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    expect(await screen.findByText('sunucu hatasi')).toBeInTheDocument();
  });

  it('listeden bir konusma secince mesajlarini gosterir, geri butonu listeye doner', async () => {
    vi.spyOn(api, 'listChatConversations').mockResolvedValue([
      { id: 'c1', title: 'Eski Konuşma', updatedAt: new Date().toISOString() },
    ]);
    vi.spyOn(api, 'getChatConversation').mockResolvedValue({
      id: 'c1',
      title: 'Eski Konuşma',
      messages: [{ role: 'user', content: 'onceki soru' }],
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    await user.click(await screen.findByText('Eski Konuşma'));
    expect(await screen.findByText('onceki soru')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Konuşma listesine dön' }));
    expect(await screen.findByText('Eski Konuşma')).toBeInTheDocument();
    expect(screen.queryByText('onceki soru')).not.toBeInTheDocument();
  });

  it('konusma silme onay sonrasi deleteChatConversation i cagirir', async () => {
    vi.spyOn(api, 'listChatConversations').mockResolvedValue([
      { id: 'c1', title: 'Silinecek Konuşma', updatedAt: new Date().toISOString() },
    ]);
    const deleteSpy = vi.spyOn(api, 'deleteChatConversation').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));
    await screen.findByText('Silinecek Konuşma');

    await user.click(screen.getByRole('button', { name: 'Konuşmayı sil' }));
    await user.click(screen.getByRole('button', { name: 'Sil' }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('c1'));
  });
});
