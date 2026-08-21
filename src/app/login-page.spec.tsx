import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';
import * as api from '../lib/api';

function renderLoginPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  it('gecersiz e-posta girildiginde dogrulama hatasi gosterir', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('E-posta'), 'gecersiz-eposta');
    await user.type(screen.getByLabelText('Şifre'), 'sifre1234');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    expect(await screen.findByText('Geçerli bir e-posta adresi girin.')).toBeInTheDocument();
  });

  it('API hatasi doner ve mesaj gosterilir', async () => {
    vi.spyOn(api, 'login').mockRejectedValue(
      new api.ApiError('INVALID_CREDENTIALS', 'E-posta veya sifre hatali.', 401),
    );
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('E-posta'), 'test@example.com');
    await user.type(screen.getByLabelText('Şifre'), 'sifre1234');
    await user.click(screen.getByRole('button', { name: 'Giriş yap' }));

    await waitFor(() => {
      expect(screen.getByText('E-posta veya sifre hatali.')).toBeInTheDocument();
    });
  });
});
