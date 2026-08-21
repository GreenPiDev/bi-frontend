import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RegisterPage } from './register-page';

function renderRegisterPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  it('kisa sifre girildiginde dogrulama hatasi gosterir', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText('Şirket adı'), 'Test Firma');
    await user.type(screen.getByLabelText('Ad soyad'), 'Test Kullanici');
    await user.type(screen.getByLabelText('E-posta'), 'test@example.com');
    await user.type(screen.getByLabelText('Şifre'), '123');
    await user.click(screen.getByRole('button', { name: 'Kaydol' }));

    expect(await screen.findByText('Şifre en az 8 karakter olmalı.')).toBeInTheDocument();
  });
});
