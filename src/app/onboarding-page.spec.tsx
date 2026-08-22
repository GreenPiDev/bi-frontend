import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './onboarding-page';
import * as api from '../lib/api';

function renderOnboardingPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboards/:id" element={<div>dashboard-view-page</div>} />
          <Route path="/dashboards" element={<div>dashboards-list-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const FIELDS: api.DatasetField[] = [
  {
    id: 'f1',
    datasetId: 'ds1',
    sourceName: 'Toplam Tutar',
    name: 'toplam_tutar',
    label: 'Toplam Tutar',
    type: 'NUMBER',
    role: 'MEASURE',
    format: null,
    isVisible: true,
    ordinal: 0,
  },
];

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('demo veriyle basla akisini tamamlar: seed -> hazir -> kolon onayla -> pano olustur', async () => {
    vi.spyOn(api, 'seedDemoDataset').mockResolvedValue({ id: 'src-1' });
    vi.spyOn(api, 'getDatasourceStatus').mockResolvedValue({
      id: 'src-1',
      status: 'READY',
      errorMessage: null,
      datasetId: 'ds1',
    });
    vi.spyOn(api, 'getDataset').mockResolvedValue({
      id: 'ds1',
      name: 'Demo Satis Verisi',
      rowCount: 180,
      lastIngestedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      fields: FIELDS,
    });
    const createDashboardSpy = vi
      .spyOn(api, 'createStarterDashboard')
      .mockResolvedValue({ id: 'dash-1' });

    const user = userEvent.setup();
    renderOnboardingPage();

    await user.click(await screen.findByText('Demo Veriyle Başla'));

    expect(await screen.findByText('2. Kolonları Onayla')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toplam Tutar')).toBeInTheDocument();

    await user.click(screen.getByText('Devam Et'));

    expect(await screen.findByText('3. İlk Panonu Oluştur')).toBeInTheDocument();
    await user.click(screen.getByText('Panomu Oluştur'));

    await waitFor(() => {
      expect(screen.getByText('dashboard-view-page')).toBeInTheDocument();
    });
    expect(createDashboardSpy).toHaveBeenCalledWith('ds1');
  });

  it('dosya secilmeden yukleme denenirse hata gosterir', async () => {
    const user = userEvent.setup();
    renderOnboardingPage();

    await user.click(await screen.findByText('Dosyamı Yükle'));
    expect(await screen.findByText('Lütfen bir dosya seç.')).toBeInTheDocument();
  });

  it('ingest basarisiz olursa hata gosterir ve tekrar denenebilir', async () => {
    vi.spyOn(api, 'seedDemoDataset').mockResolvedValue({ id: 'src-1' });
    vi.spyOn(api, 'getDatasourceStatus').mockResolvedValue({
      id: 'src-1',
      status: 'FAILED',
      errorMessage: 'Dosya islenirken bir hata olustu.',
      datasetId: null,
    });

    const user = userEvent.setup();
    renderOnboardingPage();

    await user.click(await screen.findByText('Demo Veriyle Başla'));
    expect(
      await screen.findByText('İşleme başarısız oldu. Lütfen tekrar dene.'),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Tekrar Dene'));
    expect(await screen.findByText('1. Verini Yükle')).toBeInTheDocument();
  });
});
