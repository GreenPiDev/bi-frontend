import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as api from '../lib/api';
import { createMockUser } from '../test/mock-user';

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

const baseUser = createMockUser({ email: 'a@test.com', name: 'A' });

describe('PageModuleRoute', () => {
  it('accounts sayfasi crm modulune atanmis ve crm kapaliyken bilgi mesaji gosterir, firma listesini gostermez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(baseUser);
    vi.spyOn(api, 'getMyPageAccess').mockResolvedValue([
      { pageKey: 'accounts', moduleKeys: ['crm'], accessible: false },
    ]);
    renderAppAt('/firmalar');

    await waitFor(() => {
      expect(screen.getByText('CRM modülü kapalı')).toBeInTheDocument();
    });
    expect(screen.queryByText('Yeni Firma')).not.toBeInTheDocument();
  });

  it('accounts sayfasi accessible=true ise firma listesini gosterir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(baseUser);
    vi.spyOn(api, 'getMyPageAccess').mockResolvedValue([
      { pageKey: 'accounts', moduleKeys: ['crm'], accessible: true },
    ]);
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderAppAt('/firmalar');

    await waitFor(() => {
      expect(screen.getByText('Yeni Firma')).toBeInTheDocument();
    });
  });

  it('accounts sayfasina hic modul atanmamissa (eslesme yok) dogrudan erisilebilir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(baseUser);
    vi.spyOn(api, 'getMyPageAccess').mockResolvedValue([]);
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderAppAt('/firmalar');

    await waitFor(() => {
      expect(screen.getByText('Yeni Firma')).toBeInTheDocument();
    });
  });
});
