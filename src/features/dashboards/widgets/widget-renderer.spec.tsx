import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WidgetRenderer } from './widget-renderer';
import * as api from '../../../lib/api';
import type { Widget } from '../../../lib/api';

function makeWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'w1',
    dashboardId: 'd1',
    type: 'kpi',
    title: 'Toplam Ciro',
    querySpec: {
      datasetId: 'ds-1',
      measures: [{ field: 'tutar', agg: 'sum', alias: 'toplam' }],
      dimensions: [],
      filters: [],
      orderBy: [],
    },
    vizOptions: {},
    position: { x: 0, y: 0, w: 2, h: 2 },
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderWidget(widget: Widget) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <WidgetRenderer widget={widget} />
    </QueryClientProvider>,
  );
}

describe('WidgetRenderer', () => {
  it('yuklenirken yukleniyor mesaji gosterir', () => {
    vi.spyOn(api, 'runQuery').mockReturnValue(new Promise(() => undefined));
    renderWidget(makeWidget());
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('hata durumunda mesaj ve tekrar dene gosterir', async () => {
    vi.spyOn(api, 'runQuery').mockRejectedValue(
      new api.ApiError('UNKNOWN_FIELD', 'Bilinmeyen alan.', 400),
    );
    renderWidget(makeWidget());
    expect(await screen.findByText('Bilinmeyen alan.')).toBeInTheDocument();
    expect(screen.getByText('Tekrar dene')).toBeInTheDocument();
  });

  it('bos sonucta bos durum gosterir', async () => {
    vi.spyOn(api, 'runQuery').mockResolvedValue({
      columns: [{ name: 'toplam', type: 'NUMBER', label: 'Toplam' }],
      rows: [],
      rowCount: 0,
      executionMs: 1,
      truncated: false,
    });
    renderWidget(makeWidget());
    expect(await screen.findByText('Bu ölçüt için veri yok.')).toBeInTheDocument();
  });

  it('kpi tipinde deger render eder', async () => {
    vi.spyOn(api, 'runQuery').mockResolvedValue({
      columns: [{ name: 'toplam', type: 'NUMBER', label: 'Toplam' }],
      rows: [[4200]],
      rowCount: 1,
      executionMs: 1,
      truncated: false,
    });
    renderWidget(makeWidget());
    expect(await screen.findByText('4.200')).toBeInTheDocument();
  });
});
