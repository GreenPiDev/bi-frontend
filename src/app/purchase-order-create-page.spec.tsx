import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderCreatePage } from './purchase-order-create-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/siparisler/yeni']}>
          <Routes>
            <Route path="/siparisler" element={<div>list-page</div>} />
            <Route path="/siparisler/yeni" element={<PurchaseOrderCreatePage />} />
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

const purchaseOrder: api.PurchaseOrder = {
  id: 'po-new',
  orderNumber: 'SIP-2026-09-28-001',
  title: null,
  quoteId: null,
  quote: null,
  status: 'DRAFT',
  createdById: 'u1',
  items: [],
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
};

describe('PurchaseOrderCreatePage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listAccounts').mockResolvedValue({
      data: [quote.account],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [quote],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    });
  });

  it('teklif secilmeden manuel kalemlerle siparis olusturur', async () => {
    const createSpy = vi.spyOn(api, 'createPurchaseOrder').mockResolvedValue(purchaseOrder);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Yeni Sipariş');
    await user.type(screen.getByLabelText('Açıklama'), 'Ofis sarf malzemesi');
    await user.clear(screen.getByLabelText(/Miktar/));
    await user.type(screen.getByLabelText(/Miktar/), '2');
    await user.click(screen.getByRole('button', { name: 'Sipariş Oluştur' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    const [input] = createSpy.mock.calls[0];
    expect(input.quoteId).toBeUndefined();
    expect(input.items).toEqual([
      { productId: undefined, description: 'Ofis sarf malzemesi', quantity: 2 },
    ]);

    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('?quoteId= ile acilinca teklifin firma/urun bilgileriyle onceden doldurulur (SP1/SP2)', async () => {
    vi.spyOn(api, 'getPurchaseOrderDraftFromQuote').mockResolvedValue({
      accountId: 'acc-1',
      quoteId: 'q1',
      quoteNumber: 'TEK-2026-09-07-001',
      items: [
        {
          productId: 'p1',
          productListId: 'pl1',
          productName: 'Sunucu',
          quantity: 7,
        },
      ],
    });
    vi.spyOn(api, 'getAccount').mockResolvedValue({
      ...quote.account,
      contacts: [],
    });
    vi.spyOn(api, 'getProduct').mockResolvedValue({
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
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      deletedAt: null,
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/siparisler/yeni?quoteId=q1']}>
            <Routes>
              <Route path="/siparisler/yeni" element={<PurchaseOrderCreatePage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    await screen.findByDisplayValue('Acme A.S.');
    await screen.findByDisplayValue('Sunucu');
    expect(screen.getByLabelText(/Miktar/)).toHaveValue('7');
  });
});
