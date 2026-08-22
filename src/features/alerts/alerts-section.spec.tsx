import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AlertsSection } from './alerts-section';
import * as api from '../../lib/api';

function renderSection() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AlertsSection />
    </QueryClientProvider>,
  );
}

describe('AlertsSection', () => {
  it('alarm yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listAlerts').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderSection();
    expect(await screen.findByText('Henüz eşik alarmı yok.')).toBeInTheDocument();
  });

  it('mevcut alarmlari pano/widget adiyla listeler', async () => {
    vi.spyOn(api, 'listAlerts').mockResolvedValue([
      {
        id: 'al1',
        widgetId: 'w1',
        operator: 'lt',
        threshold: 1000,
        recipients: ['a@test.com'],
        lastTriggeredAt: null,
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
    vi.spyOn(api, 'getDashboard').mockResolvedValue({
      id: 'd1',
      name: 'Satış Panosu',
      description: null,
      layout: [],
      filters: [],
      createdById: 'u1',
      createdAt: '2026-08-01T00:00:00.000Z',
      widgets: [
        {
          id: 'w1',
          dashboardId: 'd1',
          type: 'kpi',
          title: 'Toplam Ciro',
          querySpec: {
            datasetId: 'ds1',
            measures: [],
            dimensions: [],
            filters: [],
            orderBy: [],
          },
          vizOptions: {},
          position: { x: 0, y: 0, w: 2, h: 2 },
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    renderSection();
    expect(await screen.findByText('Satış Panosu · Toplam Ciro')).toBeInTheDocument();
    expect(screen.getByText(/küçükse 1000/)).toBeInTheDocument();
  });

  it('+ Alarm Ekle formu acar, gerekli alanlar doldurulmadan gonderilemez', async () => {
    vi.spyOn(api, 'listAlerts').mockResolvedValue([]);
    vi.spyOn(api, 'listDashboards').mockResolvedValue([]);
    renderSection();
    fireEvent.click(await screen.findByText('+ Alarm Ekle'));
    const createButton = await screen.findByText('Alarm Oluştur');
    expect(createButton).toBeDisabled();
  });

  it('gecerli formla alarm olusturur', async () => {
    vi.spyOn(api, 'listAlerts').mockResolvedValue([]);
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
    vi.spyOn(api, 'getDashboard').mockResolvedValue({
      id: 'd1',
      name: 'Satış Panosu',
      description: null,
      layout: [],
      filters: [],
      createdById: 'u1',
      createdAt: '2026-08-01T00:00:00.000Z',
      widgets: [
        {
          id: 'w1',
          dashboardId: 'd1',
          type: 'kpi',
          title: 'Toplam Ciro',
          querySpec: {
            datasetId: 'ds1',
            measures: [],
            dimensions: [],
            filters: [],
            orderBy: [],
          },
          vizOptions: {},
          position: { x: 0, y: 0, w: 2, h: 2 },
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    const createSpy = vi.spyOn(api, 'createAlert').mockResolvedValue({
      id: 'al1',
      widgetId: 'w1',
      operator: 'lt',
      threshold: 1000,
      recipients: ['a@test.com'],
      lastTriggeredAt: null,
    });

    renderSection();
    fireEvent.click(await screen.findByText('+ Alarm Ekle'));
    fireEvent.change(await screen.findByLabelText('Pano'), { target: { value: 'd1' } });
    fireEvent.change(await screen.findByLabelText('Widget'), { target: { value: 'w1' } });
    fireEvent.change(screen.getByLabelText('Eşik değeri'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Alıcılar/), { target: { value: 'a@test.com' } });
    fireEvent.click(screen.getByText('Alarm Oluştur'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        widgetId: 'w1',
        operator: 'lt',
        threshold: 1000,
        recipients: ['a@test.com'],
      });
    });
  });
});
