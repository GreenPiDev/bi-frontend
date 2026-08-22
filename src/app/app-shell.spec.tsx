import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import * as api from '../lib/api';

function renderShell() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppShell>
          <div>icerik</div>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const BASE_USER: api.SafeUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'test@test.com',
  name: 'Test Kullanici',
  role: 'OWNER',
  isPlatformAdmin: false,
};

describe('AppShell', () => {
  it('platform admin olmayan kullaniciya Kiraci Yonetimi linkini gostermez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(BASE_USER);
    renderShell();
    await screen.findByText('Test Kullanici', { exact: false });
    expect(screen.queryByText('Kiracı Yönetimi')).not.toBeInTheDocument();
  });

  it('platform admin kullaniciya Kiraci Yonetimi linkini gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({ ...BASE_USER, isPlatformAdmin: true });
    renderShell();
    expect(await screen.findByText('Kiracı Yönetimi')).toBeInTheDocument();
  });
});
