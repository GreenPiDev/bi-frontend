import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './settings-page';
import * as api from '../lib/api';

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
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('kayit yokken bos durum gosterir', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'listAuditLogs').mockResolvedValue([]);
    renderSettingsPage();
    await user.click(screen.getByRole('tab', { name: 'Denetim Kaydı' }));
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
    await user.click(screen.getByRole('tab', { name: 'Denetim Kaydı' }));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Oluşturdu')).toBeInTheDocument();
    expect(screen.getByText('Pano')).toBeInTheDocument();
  });
});
