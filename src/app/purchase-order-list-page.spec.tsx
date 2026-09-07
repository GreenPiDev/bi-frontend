import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderListPage } from './purchase-order-list-page';
import * as api from '../lib/api';

function renderPurchaseOrderListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/siparisler']}>
        <Routes>
          <Route path="/siparisler" element={<PurchaseOrderListPage />} />
          <Route path="/siparisler/:id" element={<div>detail-page</div>} />
        </Routes>
      </MemoryRouter>
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

const purchaseOrder: api.PurchaseOrder = {
  id: 'po-1',
  orderNumber: 'SIP-2026-09-07-001',
  quoteId: 'q1',
  quote,
  projectId: null,
  project: null,
  status: 'DRAFT',
  createdById: 'u1',
  items: [],
  createdAt: '2026-09-07T00:00:00.000Z',
  updatedAt: '2026-09-07T00:00:00.000Z',
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
});
