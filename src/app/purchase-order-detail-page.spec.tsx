import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderDetailPage } from './purchase-order-detail-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPage(initialPath = '/siparisler/po-1') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/siparisler" element={<div>list-page</div>} />
            <Route path="/siparisler/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/teklifler/:id" element={<div>quote-detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const quote: api.Quote = {
  id: 'q1',
  quoteNumber: 'TEK-2026-09-07-001',
  accountId: 'acc-1',
  account: {
    id: 'acc-1',
    name: 'Acme A.S.',
    taxNumber: null,
    taxOffice: null,
    sector: null,
    accountTypes: [],
    website: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    ownerId: null,
    missingCriticalFields: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  contactId: null,
  contact: null,
  priceListId: 'pl-1',
  priceList: {
    id: 'pl-1',
    name: 'Genel',
    isDefault: true,
    items: [],
    createdAt: '',
    updatedAt: '',
  },
  status: 'APPROVED',
  approvedAt: '2026-09-01T00:00:00.000Z',
  approvedById: 'u1',
  createdById: 'u1',
  items: [],
  opportunity: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const product: api.Product = {
  id: 'p1',
  name: 'Widget',
  sku: 'W-1',
  unit: 'adet',
  minStockLevel: 5,
  maxDiscountPct: null,
  description: null,
  category: null,
  costPrice: null,
  imageUrl: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const purchaseOrder: api.PurchaseOrder = {
  id: 'po-1',
  orderNumber: 'SIP-2026-09-07-001',
  quoteId: 'q1',
  quote,
  projectId: null,
  project: null,
  status: 'DRAFT',
  createdById: 'u1',
  items: [
    {
      id: 'item-1',
      purchaseOrderId: 'po-1',
      productId: 'p1',
      description: 'Widget',
      quantity: '3',
      source: 'QUOTE',
      product,
      createdAt: '2026-09-07T00:00:00.000Z',
    },
  ],
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

describe('PurchaseOrderDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listProducts').mockResolvedValue({
      data: [product],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
  });

  it('siparis basligini ve kalemlerini gosterir', async () => {
    vi.spyOn(api, 'getPurchaseOrder').mockResolvedValue(purchaseOrder);
    renderPage();

    expect(await screen.findByText('SIP-2026-09-07-001')).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /Ürün/ })).toHaveValue('p1');
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('teklif linkine tiklayinca teklif detayina gider', async () => {
    vi.spyOn(api, 'getPurchaseOrder').mockResolvedValue(purchaseOrder);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText('İlişkili teklifi gör'));
    expect(await screen.findByText('quote-detail-page')).toBeInTheDocument();
  });

  it('ek kalem eklenip kaydedilince guncelleme cagrisi yapilir', async () => {
    vi.spyOn(api, 'getPurchaseOrder').mockResolvedValue(purchaseOrder);
    const updateSpy = vi.spyOn(api, 'updatePurchaseOrder').mockResolvedValue(purchaseOrder);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('SIP-2026-09-07-001');
    await user.click(screen.getByRole('button', { name: 'Ek Kalem Ekle' }));

    const descriptionInputs = screen.getAllByLabelText(/Açıklama/);
    await user.type(descriptionInputs[descriptionInputs.length - 1], 'Ekstra kalem');

    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [, input] = updateSpy.mock.calls[0];
    expect(input.items).toHaveLength(2);
    expect(input.items?.[1]).toMatchObject({ description: 'Ekstra kalem', source: 'EXTRA' });
  });
});
