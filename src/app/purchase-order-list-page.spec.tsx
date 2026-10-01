import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderListPage } from './purchase-order-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPurchaseOrderListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/siparisler']}>
          <Routes>
            <Route path="/siparisler" element={<PurchaseOrderListPage />} />
            <Route path="/siparisler/duzenle/:id" element={<div>edit-page</div>} />
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
  createdById: 'u1',
  createdByName: 'Admin',
  items: [],
  opportunity: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const purchaseOrder: api.PurchaseOrder = {
  id: 'po-1',
  orderNumber: 'SIP-2026-09-07-001',
  quoteId: 'q1',
  quote: { ...quote, project: null },
  status: 'DRAFT',
  createdById: 'u1',
  items: [],
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
};

const project: api.Project = {
  id: 'proj-1',
  projectNumber: 'PRJ-2026-09-07-001',
  accountId: 'acc-1',
  name: 'Saha Elektrik Tesisati',
  estimatedBudget: '10000',
  actualCost: null,
  createdById: 'u1',
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
  quotes: [],
  responsibleUsers: [],
};

describe('PurchaseOrderListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('siparis yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listPurchaseOrders').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderPurchaseOrderListPage();

    expect(await screen.findByText('Henüz sipariş kaydı yok.')).toBeInTheDocument();
  });

  it('siparisleri listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listPurchaseOrders').mockResolvedValue({
      data: [purchaseOrder],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderPurchaseOrderListPage();

    expect(await screen.findByText('SIP-2026-09-07-001')).toBeInTheDocument();
    expect(screen.getByText('TEK-2026-09-07-001')).toBeInTheDocument();
    await user.click(screen.getByText('SIP-2026-09-07-001'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });

  it('siparisin teklifi bir projeye bagliysa "Proje" kolonunda proje adini gosterir', async () => {
    vi.spyOn(api, 'listPurchaseOrders').mockResolvedValue({
      data: [{ ...purchaseOrder, quote: { ...quote, project } }],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    renderPurchaseOrderListPage();

    expect(await screen.findByText('Saha Elektrik Tesisati')).toBeInTheDocument();
  });

  it('duzenle ikonuna tiklayinca duzenleme sayfasina gider', async () => {
    vi.spyOn(api, 'listPurchaseOrders').mockResolvedValue({
      data: [purchaseOrder],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderPurchaseOrderListPage();

    await screen.findByText('SIP-2026-09-07-001');
    await user.click(screen.getByRole('button', { name: 'Düzenle' }));
    expect(await screen.findByText('edit-page')).toBeInTheDocument();
  });
});
