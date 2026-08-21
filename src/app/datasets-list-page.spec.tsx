import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetsListPage } from './datasets-list-page';
import * as api from '../lib/api';

function renderDatasetsListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/datasets']}>
        <Routes>
          <Route path="/datasets" element={<DatasetsListPage />} />
          <Route path="/datasets/upload" element={<div>upload-page</div>} />
          <Route path="/datasets/:id" element={<div>detail-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetsListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('veri kumesi yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listDatasets').mockResolvedValue([]);
    renderDatasetsListPage();

    expect(
      await screen.findByText('Henüz veri kümesi yok. Başlamak için bir dosya yükleyin.'),
    ).toBeInTheDocument();
  });

  it('veri kumelerini listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listDatasets').mockResolvedValue([
      {
        id: 'ds-1',
        name: 'Satış Verisi',
        rowCount: 1234,
        lastIngestedAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
    const user = userEvent.setup();
    renderDatasetsListPage();

    expect(await screen.findByText('Satış Verisi')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();

    await user.click(screen.getByText('Satış Verisi'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('dosya yukle butonu yukleme sayfasina gider', async () => {
    vi.spyOn(api, 'listDatasets').mockResolvedValue([]);
    const user = userEvent.setup();
    renderDatasetsListPage();

    await user.click(await screen.findByRole('button', { name: 'Dosya Yükle' }));
    expect(await screen.findByText('upload-page')).toBeInTheDocument();
  });
});
