import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatasetUploadPage } from './dataset-upload-page';
import * as api from '../lib/api';

function renderUploadPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/datasets/upload']}>
        <Routes>
          <Route path="/datasets/upload" element={<DatasetUploadPage />} />
          <Route path="/datasets/processing/:dataSourceId" element={<div>processing-page</div>} />
          <Route path="/datasets" element={<div>list-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasetUploadPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('dosya secilmeden gonderilirse hata gosterir', async () => {
    const user = userEvent.setup();
    renderUploadPage();

    await user.click(screen.getByRole('button', { name: 'Devam Et' }));
    expect(await screen.findByText('Lütfen bir dosya seçin.')).toBeInTheDocument();
  });

  it('dosya secilince ham satirlari onizler, baslik satiri secilince yukler ve isleme sayfasina gider', async () => {
    const previewSpy = vi.spyOn(api, 'previewDatasourceRaw').mockResolvedValue({
      rows: [
        ['a', 'b'],
        ['1', '2'],
      ],
    });
    const uploadSpy = vi.spyOn(api, 'uploadDatasource').mockResolvedValue({ id: 'src-1' });
    const user = userEvent.setup();
    renderUploadPage();

    const file = new File(['a,b\n1,2'], 'veri.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText('Dosya');
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Devam Et' }));

    expect(previewSpy).toHaveBeenCalledWith(file);
    const pickButtons = await screen.findAllByRole('button', { name: 'Bu satır başlık' });
    await user.click(pickButtons[0]);

    expect(await screen.findByText('processing-page')).toBeInTheDocument();
    expect(uploadSpy).toHaveBeenCalledWith(file, undefined, 0);
  });

  it('api hatasi mesaji gosterilir', async () => {
    vi.spyOn(api, 'previewDatasourceRaw').mockResolvedValue({
      rows: [
        ['a', 'b'],
        ['1', '2'],
      ],
    });
    vi.spyOn(api, 'uploadDatasource').mockRejectedValue(
      new api.ApiError('FILE_TOO_LARGE', 'Dosya cok buyuk.', 400),
    );
    const user = userEvent.setup();
    renderUploadPage();

    const file = new File(['a,b\n1,2'], 'veri.csv', { type: 'text/csv' });
    await user.upload(screen.getByLabelText('Dosya'), file);
    await user.click(screen.getByRole('button', { name: 'Devam Et' }));

    const pickButtons = await screen.findAllByRole('button', { name: 'Bu satır başlık' });
    await user.click(pickButtons[0]);

    expect(await screen.findByText('Dosya cok buyuk.')).toBeInTheDocument();
  });
});
