import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui/toast';
import { NewCustomerPage } from './new-customer-page';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <NewCustomerPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  vi.spyOn(api, 'me').mockResolvedValue({
    id: 'u1',
    tenantId: 't1',
    email: 'admin@test.com',
    name: 'Admin Kisi',
    roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
    isPlatformAdmin: true,
    avatarUrl: null,
    permissions: { isCompanyAdmin: true, permissions: [] },
  });
});

describe('NewCustomerPage', () => {
  it('formu doldurup gonderince uretilen gecici sifreyi gosterir', async () => {
    vi.spyOn(api, 'createTenant').mockResolvedValue({
      tenant: {
        id: 't-new',
        name: 'Yeni Musteri A.S.',
        slug: 'yeni-musteri-as',
        plan: 'trial',
        createdAt: new Date().toISOString(),
        adminEmail: 'yetkili@yenimusteri.com',
      },
      temporaryPassword: '048213',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Şirket adı'), {
      target: { value: 'Yeni Musteri A.S.' },
    });
    fireEvent.change(screen.getByLabelText('Yetkili adı soyadı'), {
      target: { value: 'Yetkili Kisi' },
    });
    fireEvent.change(screen.getByLabelText('Yetkili e-posta'), {
      target: { value: 'yetkili@yenimusteri.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Şirketi Oluştur' }));

    expect(await screen.findByDisplayValue('048213')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yetkili@yenimusteri.com')).toBeInTheDocument();
    expect(api.createTenant).toHaveBeenCalledWith({
      tenantName: 'Yeni Musteri A.S.',
      adminName: 'Yetkili Kisi',
      adminEmail: 'yetkili@yenimusteri.com',
    });
  });

  it('geri don linki platform-admin sayfasina gider', () => {
    renderPage();
    const backLink = screen.getByText('Önceki sayfaya dön').closest('a');
    expect(backLink).toHaveAttribute('href', '/platform-admin');
  });
});
