import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../lib/api';
import { clearChatHistory } from './chatbot-storage';
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
  permissions: { isCompanyAdmin: true, permissions: [] },
};

const USER_B: api.AuthenticatedUser = {
  ...USER_A,
  id: 'user-b',
  email: 'b@example.com',
  name: 'Kullanici B',
};

function renderWidget() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboards']}>
        <ChatbotWidget />
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChatbotWidget', () => {
  beforeEach(() => {
    clearChatHistory();
    vi.spyOn(api, 'me').mockResolvedValue(USER_A);
  });

  it('varsayilan olarak kapali durumdadir, butona tiklayinca acilir', async () => {
    const user = userEvent.setup();
    renderWidget();

    expect(screen.queryByText('PiLens Asistanı')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    expect(screen.getByText('PiLens Asistanı')).toBeInTheDocument();
  });

  it('mesaj gonderip cevabi balon olarak gosterir', async () => {
    vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      reply: 'Toplam satışınız 1.000 TL.',
      navigateTo: null,
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    await user.type(screen.getByPlaceholderText('Bir soru sorun...'), 'toplam satis ne kadar?');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    expect(await screen.findByText('Toplam satışınız 1.000 TL.')).toBeInTheDocument();
    expect(screen.getByText('toplam satis ne kadar?')).toBeInTheDocument();
  });

  it('navigateTo donerse ilgili sayfaya yonlendirir', async () => {
    vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      reply: 'Panolara yönlendiriyorum.',
      navigateTo: '/datasets',
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    await user.type(screen.getByPlaceholderText('Bir soru sorun...'), 'veri kumelerine git');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/datasets');
    });
  });

  it('hata durumunda kullaniciya hata mesaji gosterir', async () => {
    vi.spyOn(api, 'sendChatMessage').mockRejectedValue(
      new api.ApiError('UNKNOWN_ERROR', 'sunucu hatasi', 500),
    );
    const user = userEvent.setup();
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    await user.type(screen.getByPlaceholderText('Bir soru sorun...'), 'merhaba');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));

    expect(await screen.findByText('Bir hata oluştu, lütfen tekrar deneyin.')).toBeInTheDocument();
  });

  it('farkli bir kullaniciya gecince onceki kullanicinin sohbet gecmisi gorunmez', async () => {
    vi.spyOn(api, 'sendChatMessage').mockResolvedValue({
      reply: 'A kullanicisina ozel cevap.',
      navigateTo: null,
    });
    const user = userEvent.setup();
    const { unmount } = renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));
    await user.type(screen.getByPlaceholderText('Bir soru sorun...'), 'gizli soru A');
    await user.click(screen.getByRole('button', { name: 'Gönder' }));
    await screen.findByText('A kullanicisina ozel cevap.');
    unmount();

    // Gercek davet-kabul akisinda oldugu gibi: logout cagrisi olmadan farkli
    // bir kullanici olarak AppShell yeniden monte edilir (fresh QueryClient).
    vi.spyOn(api, 'me').mockResolvedValue(USER_B);
    renderWidget();
    await user.click(screen.getByRole('button', { name: 'Asistanı aç' }));

    expect(screen.queryByText('gizli soru A')).not.toBeInTheDocument();
    expect(screen.queryByText('A kullanicisina ozel cevap.')).not.toBeInTheDocument();
    expect(screen.getByText(/Merhaba! Verileriniz hakkında/)).toBeInTheDocument();
  });
});
