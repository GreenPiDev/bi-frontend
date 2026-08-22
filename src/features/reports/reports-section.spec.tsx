import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportsSection } from './reports-section';
import * as api from '../../lib/api';

function renderSection() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportsSection />
    </QueryClientProvider>,
  );
}

describe('ReportsSection', () => {
  it('rapor yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listReports').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderSection();
    expect(await screen.findByText('Henüz zamanlanmış rapor yok.')).toBeInTheDocument();
  });

  it('mevcut raporlari pano adi ve okunabilir sikilikla listeler', async () => {
    vi.spyOn(api, 'listReports').mockResolvedValue([
      {
        id: 'r1',
        dashboardId: 'd1',
        cron: '0 8 * * 1',
        recipients: ['a@test.com'],
        isActive: true,
        lastRunAt: null,
      },
    ]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([
      {
        id: 'd1',
        name: 'Satış Panosu',
        description: null,
        layout: [],
        filters: [],
        createdById: 'u1',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    renderSection();
    expect(await screen.findByText('Satış Panosu')).toBeInTheDocument();
    expect(screen.getByText(/Her Pazartesi saat 08:00/)).toBeInTheDocument();
  });

  it('+ Rapor Ekle formu acar ve gerekli alanlar doldurulmadan gonderilemez', async () => {
    vi.spyOn(api, 'listReports').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([
      {
        id: 'd1',
        name: 'Satış Panosu',
        description: null,
        layout: [],
        filters: [],
        createdById: 'u1',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    renderSection();
    fireEvent.click(await screen.findByText('+ Rapor Ekle'));
    const createButton = await screen.findByText('Rapor Oluştur');
    expect(createButton).toBeDisabled();
  });

  it('gecerli formla rapor olusturur', async () => {
    vi.spyOn(api, 'listReports').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([
      {
        id: 'd1',
        name: 'Satış Panosu',
        description: null,
        layout: [],
        filters: [],
        createdById: 'u1',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const createSpy = vi.spyOn(api, 'createReport').mockResolvedValue({
      id: 'r1',
      dashboardId: 'd1',
      cron: '0 8 * * *',
      recipients: ['a@test.com'],
      isActive: true,
      lastRunAt: null,
    });
    renderSection();
    fireEvent.click(await screen.findByText('+ Rapor Ekle'));
    fireEvent.change(await screen.findByLabelText('Pano'), { target: { value: 'd1' } });
    fireEvent.change(screen.getByLabelText(/Alıcılar/), {
      target: { value: 'a@test.com' },
    });
    fireEvent.click(screen.getByText('Rapor Oluştur'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        dashboardId: 'd1',
        cron: '0 8 * * *',
        recipients: ['a@test.com'],
      });
    });
  });
});
