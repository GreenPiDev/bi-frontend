import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui/toast';
import { PlatformAdminTenantActions } from './platform-admin-tenant-actions';
import * as api from '../lib/api';

function renderComponent(adminEmail: string | null = 'yetkili@musteri.com') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PlatformAdminTenantActions tenantId="t1" adminEmail={adminEmail} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('PlatformAdminTenantActions', () => {
  it('parola sifirla ikonuna hover edince tooltip gosterir', async () => {
    renderComponent();
    const button = screen.getByRole('button', { name: 'Parola sıfırla' });
    fireEvent.mouseEnter(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Parola sıfırla');
  });

  it('ikona tiklaninca sifreyi sifirlar ve gecici sifreyi gosterir', async () => {
    vi.spyOn(api, 'resetTenantAdminPassword').mockResolvedValue({ temporaryPassword: '048213' });

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Parola sıfırla' }));

    await waitFor(() => expect(api.resetTenantAdminPassword).toHaveBeenCalledWith('t1'));
    expect(await screen.findByDisplayValue('048213')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yetkili@musteri.com')).toBeInTheDocument();
  });
});
