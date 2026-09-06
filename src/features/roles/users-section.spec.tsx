import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/ui/toast';
import { UsersSection } from './users-section';
import * as api from '../../lib/api';
import type { SafeUser } from '../../lib/api';

const ROLES = [
  {
    id: 'r1',
    name: 'Goruntuleyici',
    isSystem: false,
    isBasic: false,
    isCompanyAdmin: false,
    userCount: 1,
    permissions: [],
  },
];

function safeUser(overrides: Pick<SafeUser, 'id' | 'email' | 'name' | 'roles'>): SafeUser {
  return { tenantId: 't1', isPlatformAdmin: false, ...overrides };
}

function renderComponent(props: Partial<Parameters<typeof UsersSection>[0]> = {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <UsersSection roles={ROLES} isCompanyAdmin currentUserId="me" {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('UsersSection', () => {
  it('kullanici olusturunca uretilen gecici sifreyi gosterir', async () => {
    vi.spyOn(api, 'listUsers').mockResolvedValue([]);
    vi.spyOn(api, 'createUser').mockResolvedValue({
      user: safeUser({ id: 'u1', email: 'yeni@test.com', name: 'Yeni Kisi', roles: [ROLES[0]] }),
      temporaryPassword: '048213',
    });

    renderComponent();

    fireEvent.click(await screen.findByText('+ Kullanıcı Ekle'));
    fireEvent.change(screen.getByLabelText('Ad Soyad'), {
      target: { value: 'Yeni Kisi' },
    });
    fireEvent.change(screen.getByLabelText('E-posta'), {
      target: { value: 'yeni@test.com' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Seçiniz' }));
    const roleCheckbox = await screen.findByRole('checkbox', { name: 'Goruntuleyici' });
    fireEvent.click(roleCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Kullanıcı Oluştur' }));

    expect(await screen.findByDisplayValue('048213')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yeni@test.com')).toBeInTheDocument();
  });

  it('kendi satirinda Yeni Sifre Uret butonu gorunmez', async () => {
    vi.spyOn(api, 'listUsers').mockResolvedValue([
      safeUser({ id: 'me', email: 'ben@test.com', name: 'Ben', roles: [ROLES[0]] }),
      safeUser({ id: 'other', email: 'baska@test.com', name: 'Baska Kisi', roles: [ROLES[0]] }),
    ]);

    renderComponent();

    await screen.findByText('ben@test.com');
    const resetButtons = screen.getAllByText('Yeni Şifre Üret');
    expect(resetButtons).toHaveLength(1);
  });

  it('Yeni Sifre Uret tiklaninca uretilen sifreyi gosterir', async () => {
    vi.spyOn(api, 'listUsers').mockResolvedValue([
      safeUser({ id: 'other', email: 'baska@test.com', name: 'Baska Kisi', roles: [ROLES[0]] }),
    ]);
    vi.spyOn(api, 'resetUserPassword').mockResolvedValue({ temporaryPassword: '739201' });

    renderComponent();

    fireEvent.click(await screen.findByText('Yeni Şifre Üret'));

    await waitFor(() => expect(api.resetUserPassword).toHaveBeenCalledWith('other'));
    expect(await screen.findByDisplayValue('739201')).toBeInTheDocument();
  });
});
