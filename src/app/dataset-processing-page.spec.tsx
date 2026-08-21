import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetProcessingPage } from './dataset-processing-page';
import * as api from '../lib/api';

function renderProcessingPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/datasets/processing/src-1']}>
        <Routes>
          <Route path="/datasets/processing/:dataSourceId" element={<DatasetProcessingPage />} />
          <Route path="/datasets/:id" element={<div>detail-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetProcessingPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('PENDING durumunda isleniyor mesaji gosterir', async () => {
    vi.spyOn(api, 'getDatasourceStatus').mockResolvedValue({
      id: 'src-1',
      status: 'PENDING',
      errorMessage: null,
      datasetId: null,
    });
    renderProcessingPage();

    expect(await screen.findByText('Dosyanız işleniyor')).toBeInTheDocument();
    expect(screen.getByText('Yükleme kuyruğa alındı, birazdan başlayacak...')).toBeInTheDocument();
  });

  it('FAILED durumunda hata mesaji ve tekrar dene secenegi gosterir', async () => {
    vi.spyOn(api, 'getDatasourceStatus').mockResolvedValue({
      id: 'src-1',
      status: 'FAILED',
      errorMessage: 'Dosya bozuk.',
      datasetId: null,
    });
    renderProcessingPage();

    expect(await screen.findByText('Yükleme başarısız oldu')).toBeInTheDocument();
    expect(screen.getByText('Dosya bozuk.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  });

  it('READY durumunda dataset detayina yonlendirir', async () => {
    vi.spyOn(api, 'getDatasourceStatus').mockResolvedValue({
      id: 'src-1',
      status: 'READY',
      errorMessage: null,
      datasetId: 'ds-1',
    });
    renderProcessingPage();

    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });
});
