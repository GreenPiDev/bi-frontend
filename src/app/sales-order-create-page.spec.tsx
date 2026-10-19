import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderCreatePage } from './sales-order-create-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

const account: api.Account = {
  id: 'acc-1',
  name: 'Acme A.S.',
  taxNumber: null,
  taxOffice: null,
  sector: [],
  accountTypes: [],
  website: null,
  phone: null,
  landlinePhone: null,
  email: null,
  address: null,
  city: null,
  district: null,
  ownerId: null,
  missingCriticalFields: [],
  customFields: null,
  createdByName: null,
  interactionCount: 0,
  quoteCount: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const product: api.ProductWithStock = {
  id: 'p1',
  productListId: 'pl1',
  productList: { id: 'pl1', name: 'Genel' },
  name: 'Sunucu',
  sku: null,
  unit: 'adet',
  minStockLevel: null,
  maxDiscountPct: null,
  price: null,
  currency: 'TRY',
  attributes: null,
  description: null,
  category: null,
  brand: null,
  avgCost: null,
  drawingSpec: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  deletedAt: null,
  stockQuantity: '0',
};

const salesOrderItem: api.SalesOrderItem = {
  id: 'soi-1',
  salesOrderId: 'so-new',
  productId: 'p1',
  product,
  quantity: '3',
  unitPrice: '150',
  currency: 'TRY',
  discountPct: '0',
  vatPct: '20',
  brand: null,
  deliveredQuantity: '0',
};

const salesOrder: api.SalesOrder = {
  id: 'so-new',
  orderNumber: 'SAT-2026-10-13-001',
  quoteId: null,
  accountId: 'acc-1',
  account,
  contactId: null,
  contact: null,
  quote: null,
  items: [salesOrderItem],
  status: 'PENDING',
  createdById: 'u1',
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/satis-siparisleri/yeni']}>
          <Routes>
            <Route path="/siparisler" element={<div>list-page</div>} />
            <Route path="/satis-siparisleri/yeni" element={<SalesOrderCreatePage />} />
            <Route path="/satis-siparisleri/:id" element={<div>detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('SalesOrderCreatePage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [account],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listProducts').mockResolvedValue({
      data: [product],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listProductLists').mockResolvedValue({
      data: [
        {
          id: 'pl1',
          name: 'Genel',
          productCount: 1,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'getProduct').mockResolvedValue(product);
    vi.spyOn(api, 'listBrandOptions').mockResolvedValue([]);
    vi.spyOn(api, 'listTenantSettings').mockResolvedValue([]);
  });

  it('firma secip bir kalem girerek teklifsiz satis siparisi olusturur', async () => {
    const createSpy = vi.spyOn(api, 'createSalesOrder').mockResolvedValue(salesOrder);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Yeni Satış Siparişi');
    // AccountAutocomplete/ProductAutocomplete <label> girdiyi htmlFor/id ile degil,
    // iceren div ile iliskilendiriyor (bkz. async-autocomplete.tsx) -
    // getByLabelText calismiyor, bu yuzden label'in yanindaki input DOM'dan bulunur.
    const accountLabel = screen.getByText('Firma');
    const accountInput = accountLabel.parentElement?.querySelector('input') as HTMLInputElement;
    await user.type(accountInput, 'Acme');
    await user.click(await screen.findByText('Acme A.S.'));

    // quote-form-page.tsx ile ayni desen: urun listesi sayfa basina BIR kere secilir
    // (register('productListId') ile, htmlFor/id iliskili - getByLabelText calisir).
    // Select'in "required" yildizi (aria-hidden span) <label>'in textContent'ine
    // dahil oldugundan ("Ürün Listesi*") tam esleşme yerine regex kullanilir.
    await user.selectOptions(await screen.findByLabelText(/Ürün Listesi/), 'pl1');

    const productLabel = screen.getByText('Ürün', { selector: 'label' });
    const productInput = productLabel.parentElement?.querySelector('input') as HTMLInputElement;
    await user.type(productInput, 'Sunucu');
    await user.click(await screen.findByText('Sunucu'));

    await user.clear(screen.getByLabelText(/Miktar/));
    await user.type(screen.getByLabelText(/Miktar/), '3');
    await user.type(screen.getByLabelText(/Birim Fiyat/), '150');

    await user.click(screen.getByRole('button', { name: 'Sipariş Oluştur' }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith({
        accountId: 'acc-1',
        items: [
          {
            productId: 'p1',
            quantity: 3,
            unitPrice: 150,
            currency: 'TRY',
            discountPct: 0,
            vatPct: 20,
            brand: undefined,
          },
        ],
      }),
    );
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });
});
