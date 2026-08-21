import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetDetailPage } from './dataset-detail-page';
import * as api from '../lib/api';

const dataset: api.DatasetWithFields = {
  id: 'ds-1',
  name: 'Satış Verisi',
  rowCount: 10,
  lastIngestedAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
  fields: [
    {
      id: 'f-1',
      datasetId: 'ds-1',
      sourceName: 'sehir',
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

function renderDetailPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/datasets/ds-1']}>
        <Routes>
          <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          <Route path="/datasets" element={<div>list-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'getDataset').mockResolvedValue(dataset);
    vi.spyOn(api, 'previewDataset').mockResolvedValue({
      columns: ['sehir'],
      rows: [['İstanbul']],
    });
  });

  it('kolon semasini ve onizlemeyi gosterir', async () => {
    renderDetailPage();

    expect(await screen.findByText('Satış Verisi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Şehir')).toBeInTheDocument();
    expect(await screen.findByText('İstanbul')).toBeInTheDocument();
  });

  it('kolon adi degistirilip kaydedilince guncelleme istegi atar', async () => {
    const updateSpy = vi.spyOn(api, 'updateDatasetFields').mockResolvedValue({
      ...dataset,
      fields: [{ ...dataset.fields[0], label: 'İl' }],
    });
    const user = userEvent.setup();
    renderDetailPage();

    const labelInput = await screen.findByDisplayValue('Şehir');
    await user.clear(labelInput);
    await user.type(labelInput, 'İl');
    await user.click(screen.getByRole('button', { name: 'Değişiklikleri Kaydet' }));

    expect(await screen.findByText('Kolonlar güncellendi.')).toBeInTheDocument();
    expect(updateSpy).toHaveBeenCalledWith('ds-1', [
      { id: 'f-1', label: 'İl', type: 'STRING', role: 'DIMENSION', isVisible: true },
    ]);
  });
});
