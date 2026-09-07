import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './settings-page';
import * as api from '../lib/api';
import { createMockUser } from '../test/mock-user';

function renderSettingsPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockResolvedValue(createMockUser());
  });

  it('kayit yokken bos durum gosterir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([]);
    renderSettingsPage();
    await user.click(await screen.findByRole('tab', { name: 'Kullanıcı Aktiviteleri' }));
    expect(await screen.findByText('Henüz bir işlem kaydedilmedi.')).toBeInTheDocument();
  });

  it('denetim kayitlarini tabloda listeler', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([
      {
        id: 'a1',
        userId: 'u1',
        userName: 'Ada Lovelace',
        userEmail: 'ada@test.com',
        action: 'CREATE',
        entity: 'Dashboard',
        entityId: 'd1',
        meta: null,
        createdAt: '2026-08-22T10:00:00.000Z',
      },
    ]);
    renderSettingsPage();
    await user.click(await screen.findByRole('tab', { name: 'Kullanıcı Aktiviteleri' }));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Oluşturdu')).toBeInTheDocument();
    expect(screen.getByText('Pano')).toBeInTheDocument();
  });

  it('detaylari genislet denince stok kaydinin meta bilgisini (urun adi) gosterir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([
      {
        id: 'a2',
        userId: 'u1',
        userName: 'Ada Lovelace',
        userEmail: 'ada@test.com',
        action: 'UPDATE',
        entity: 'StockItem',
        entityId: 'si1',
        meta: { productId: 'p1', productName: 'Sunucu', quantity: 12 },
        createdAt: '2026-08-22T10:00:00.000Z',
      },
    ]);
    renderSettingsPage();
    await user.click(await screen.findByRole('tab', { name: 'Kullanıcı Aktiviteleri' }));
    expect(await screen.findByText('Stok')).toBeInTheDocument();
    expect(screen.queryByText('Sunucu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Detayları göster' }));

    expect(await screen.findByText('Sunucu')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('stok guncellemesinde onceki ve yeni miktari birlikte gosterir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([
      {
        id: 'a3',
        userId: 'u1',
        userName: 'Ada Lovelace',
        userEmail: 'ada@test.com',
        action: 'UPDATE',
        entity: 'StockItem',
        entityId: 'si1',
        meta: { productId: 'p1', productName: 'Sunucu', previousQuantity: '3', quantity: 20 },
        createdAt: '2026-08-22T10:00:00.000Z',
      },
    ]);
    renderSettingsPage();
    await user.click(await screen.findByRole('tab', { name: 'Kullanıcı Aktiviteleri' }));
    await user.click(await screen.findByRole('button', { name: 'Detayları göster' }));

    expect(await screen.findByText('Önceki Miktar')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Yeni Miktar')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });
});
