import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderEditPage } from './purchase-order-edit-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPage(initialPath = '/siparisler/duzenle/po-1') {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/siparisler" element={<div>list-page</div>} />
            <Route path="/siparisler/duzenle/:id" element={<PurchaseOrderEditPage />} />
            <Route path="/siparisler/:id" element={<div>detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const quote: api.Quote = {
  id: 'q1',
  quoteNumber: 'TEK-2026-09-07-001',
  quoteCurrency: 'TRY',
  exchangeRates: null,
  quoteDate: '2026-09-07T00:00:00.000Z',
  leadTime: null,
  paymentMethod: null,
  title: null,
  paymentTerms: null,
  salesTerms: null,
  deliveryTerms: null,
  generalTerms: null,
  ibanBankName: null,
  ibanAccountHolderName: null,
  ibanAccountNumber: null,
  ibanNumber: null,
  templateId: null,
  template: null,
  revisionNote: null,
  revisionSnapshot: null,
  revisionCount: 0,
  lastRevisedAt: null,
  accountId: 'acc-1',
  account: {
    id: 'acc-1',
    name: 'Acme A.S.',
    taxNumber: null,
    createdByName: null,
    taxOffice: null,
    sector: [],
    accountTypes: [],
    website: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    landlinePhone: null,
    district: null,
    ownerId: null,
    missingCriticalFields: [],
    customFields: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  contactId: null,
  contact: null,
  projectId: null,
  status: 'APPROVED',
  approvedAt: '2026-09-01T00:00:00.000Z',
  approvedById: 'u1',
  senderId: 'u1',
  createdById: 'u1',
  createdByName: 'Admin',
  items: [],
  opportunity: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const product: api.Product = {
  id: 'p1',
  productListId: 'prl-1',
  productList: { id: 'prl-1', name: 'Genel' },
  name: 'Widget',
  sku: 'W-1',
  unit: 'adet',
  minStockLevel: 5,
  maxDiscountPct: null,
  price: null,
  currency: 'TRY',
  attributes: null,
  description: null,
  category: null,
  brand: null,
  avgCost: null,
  drawingSpec: null,
  deletedAt: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const productWithStock: api.ProductWithStock = { ...product, stockQuantity: '0' };

const purchaseOrder: api.PurchaseOrder = {
  id: 'po-1',
  orderNumber: 'SIP-2026-09-07-001',
  title: null,
  quoteId: 'q1',
  quote: { ...quote, project: null },
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

describe('PurchaseOrderEditPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listProducts').mockResolvedValue({
      data: [productWithStock],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'getProduct').mockResolvedValue(product);
  });

  it('siparis basligini ve kalemlerini duzenlenebilir gosterir', async () => {
    vi.spyOn(api, 'getPurchaseOrder').mockResolvedValue(purchaseOrder);
    renderPage();

    expect(await screen.findByText('SIP-2026-09-07-001')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Widget')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
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

    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });
});
