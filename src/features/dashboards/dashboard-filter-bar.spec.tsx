import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardFilterBar } from './dashboard-filter-bar';
import type { DashboardFilter } from './dashboard-filters';
import * as api from '../../lib/api';
import type { DatasetWithFields } from '../../lib/api';

function makeDataset(): DatasetWithFields {
  return {
    id: 'ds-1',
    name: 'Perakende Satış',
    rowCount: 100,
    lastIngestedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    fields: [
      {
        id: 'f1',
        datasetId: 'ds-1',
        sourceName: 'Şehir',
        name: 'sehir',
        label: 'Şehir',
        type: 'STRING',
        role: 'DIMENSION',
        format: null,
        isVisible: true,
        ordinal: 0,
      },
    ],
  };
}

function renderBar(filters: DashboardFilter[], onChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardFilterBar datasetIds={['ds-1']} filters={filters} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('DashboardFilterBar', () => {
  it('aktif filtreleri chip olarak gosterir', async () => {
    vi.spyOn(api, 'getDataset').mockResolvedValue(makeDataset());
    renderBar([
      {
        id: 'f1',
        datasetId: 'ds-1',
        datasetName: 'Perakende Satış',
        field: 'sehir',
        fieldLabel: 'Şehir',
        fieldType: 'STRING',
        op: 'eq',
        value: 'İstanbul',
        valueLabel: 'İstanbul',
      },
    ]);
    expect(await screen.findByText('Şehir')).toBeInTheDocument();
    expect(screen.getByText('İstanbul')).toBeInTheDocument();
  });

  it('carpi tiklaninca filtreyi kaldirir', async () => {
    vi.spyOn(api, 'getDataset').mockResolvedValue(makeDataset());
    const onChange = renderBar([
      {
        id: 'f1',
        datasetId: 'ds-1',
        datasetName: 'Perakende Satış',
        field: 'sehir',
        fieldLabel: 'Şehir',
        fieldType: 'STRING',
        op: 'eq',
        value: 'İstanbul',
        valueLabel: 'İstanbul',
      },
    ]);
    fireEvent.click(await screen.findByLabelText('Filtreyi kaldır'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('yeni filtre ekleme formunu acar ve alan secince kosul listesi gorunur', async () => {
    vi.spyOn(api, 'getDataset').mockResolvedValue(makeDataset());
    renderBar([]);
    fireEvent.click(await screen.findByText('+ Filtre ekle'));
    fireEvent.change(screen.getByLabelText(/Veri kümesi/), { target: { value: 'ds-1' } });
    expect(await screen.findByLabelText(/Alan/)).toBeInTheDocument();
  });
});
