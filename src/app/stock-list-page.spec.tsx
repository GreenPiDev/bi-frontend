import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockListPage } from './stock-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <StockListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const lowStockItem: api.StockItem = {
  id: 'si-1',
  productId: 'p1',
  quantity: '2',
  product: { id: 'p1', name: 'Widget', minStockLevel: 5 },
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

const okItem: api.StockItem = {
  id: 'si-2',
  productId: 'p2',
  quantity: '50',
  product: { id: 'p2', name: 'Gadget', minStockLevel: 5 },
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

describe('StockListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('stok kaydi yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listStockItems').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    vi.spyOn(api, 'listLowStockItems').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Henüz stok kaydı yok.')).toBeInTheDocument();
    expect(await screen.findByText('Minimum seviyenin altında ürün yok.')).toBeInTheDocument();
  });

  it('dusuk stoklu urunu uyari rozetiyle gosterir ve ozet sayisini bildirir', async () => {
    vi.spyOn(api, 'listStockItems').mockResolvedValue({
      data: [lowStockItem, okItem],
      meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    });
    vi.spyOn(api, 'listLowStockItems').mockResolvedValue([lowStockItem]);
    renderPage();

    expect(await screen.findByText('Widget')).toBeInTheDocument();
    expect(await screen.findByText('Düşük Stok')).toBeInTheDocument();
    expect(await screen.findByText('1 üründe stok minimum seviyenin altında.')).toBeInTheDocument();
    expect(screen.getByText('Gadget')).toBeInTheDocument();
  });

  it('miktar guncellenip kaydedilince upsert cagrisi yapilir', async () => {
    vi.spyOn(api, 'listStockItems').mockResolvedValue({
      data: [okItem],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listLowStockItems').mockResolvedValue([]);
    const upsertSpy = vi.spyOn(api, 'upsertStockItem').mockResolvedValue({
      ...okItem,
      quantity: '75',
    });
    const user = userEvent.setup();
    renderPage();

    const quantityInput = await screen.findByDisplayValue('50');
    await user.clear(quantityInput);
    await user.type(quantityInput, '75');
    await user.click(screen.getAllByRole('button', { name: 'Kaydet' })[0]);

    await waitFor(() => expect(upsertSpy).toHaveBeenCalledWith('p2', 75));
  });
});
