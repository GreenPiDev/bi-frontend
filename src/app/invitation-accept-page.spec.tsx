import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { InvitationAcceptPage } from './invitation-accept-page';
import * as api from '../lib/api';

function renderInvitationPage(token: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/invite/${token}`]}>
        <Routes>
          <Route path="/invite/:token" element={<InvitationAcceptPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('InvitationAcceptPage', () => {
  it('davet bulunamadiginda hata mesaji gosterir', async () => {
    vi.spyOn(api, 'getInvitation').mockRejectedValue(
      new api.ApiError('INVITATION_NOT_FOUND', 'Davet bulunamadi.', 404),
    );

    renderInvitationPage('olmayan-token');

    expect(await screen.findByText('Davet bulunamadı ya da geçersiz.')).toBeInTheDocument();
  });

  it('davetin suresi dolmussa uyari gosterir', async () => {
    vi.spyOn(api, 'getInvitation').mockResolvedValue({
      tenantName: 'Test Firma',
      email: 'viewer@example.com',
      role: 'VIEWER',
      expired: true,
    });

    renderInvitationPage('suresi-dolmus-token');

    expect(
      await screen.findByText('Bu davetin süresi dolmuş. Lütfen yeni bir davet isteyin.'),
    ).toBeInTheDocument();
  });

  it('gecerli davette form ve rol bilgisini gosterir', async () => {
    vi.spyOn(api, 'getInvitation').mockResolvedValue({
      tenantName: 'Test Firma',
      email: 'viewer@example.com',
      role: 'VIEWER',
      expired: false,
    });

    renderInvitationPage('gecerli-token');

    expect(
      await screen.findByText('Test Firma ekibine İzleyici olarak katılıyorsunuz.'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('viewer@example.com')).toBeInTheDocument();
  });
});
