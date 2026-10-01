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

const warehouse: api.Warehouse = {
  id: 'w1',
  name: 'Merkez Depo',
  address: null,
  isDefault: true,
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

const lowStockItem: api.StockItem = {
  id: 'si-1',
  productId: 'p1',
  quantity: '2',
  product: { id: 'p1', name: 'Widget', minStockLevel: 5, avgCost: null },
  warehouses: [{ warehouseId: 'w1', warehouseName: 'Merkez Depo', quantity: '2' }],
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

const okItem: api.StockItem = {
  id: 'si-2',
  productId: 'p2',
  quantity: '50',
  product: { id: 'p2', name: 'Gadget', minStockLevel: 5, avgCost: null },
  warehouses: [{ warehouseId: 'w1', warehouseName: 'Merkez Depo', quantity: '50' }],
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

describe('StockListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listWarehouses').mockResolvedValue({
      data: [warehouse],
      meta: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
    });
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

  it('dusuk stoklu urunu uyari ikonuyla gosterir ve ozet sayisini bildirir', async () => {
    vi.spyOn(api, 'listStockItems').mockResolvedValue({
      data: [lowStockItem, okItem],
      meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    });
    vi.spyOn(api, 'listLowStockItems').mockResolvedValue([lowStockItem]);
    renderPage();

    expect(await screen.findByText('Widget')).toBeInTheDocument();
    expect(await screen.findByText('1 üründe stok minimum seviyenin altında.')).toBeInTheDocument();
    expect(screen.getByText('Gadget')).toBeInTheDocument();
    // "Düşük Stok" artık daimi görünen bir rozet değil, hover/focus tetiklenen bir tooltip
    expect(screen.queryByText('Düşük Stok')).not.toBeInTheDocument();
  });

  it('stok artir ikonuna tiklayinca artis modali acilir, miktar+birim maliyet ile kaydedilir', async () => {
    vi.spyOn(api, 'listStockItems').mockResolvedValue({
      data: [okItem],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listLowStockItems').mockResolvedValue([]);
    vi.spyOn(api, 'listWarehouses').mockResolvedValue({
      data: [warehouse],
      meta: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
    });
    const increaseSpy = vi.spyOn(api, 'increaseStockItem').mockResolvedValue({
      ...okItem,
      quantity: '75',
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Gadget')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stok artır' }));

    await user.type(await screen.findByLabelText(/^Miktar/), '25');
    await user.type(screen.getByLabelText(/^Birim Maliyet/), '10');
    await user.type(screen.getByLabelText('Not'), 'Sayim farki');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() =>
      expect(increaseSpy).toHaveBeenCalledWith('p2', 'w1', 25, 10, 'Sayim farki'),
    );
  });
});
