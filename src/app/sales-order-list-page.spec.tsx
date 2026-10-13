import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesOrderListPage } from './sales-order-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderSalesOrderListPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/siparisler']}>
          <Routes>
            <Route path="/siparisler" element={<SalesOrderListPage />} />
            <Route path="/satis-siparisleri/:id" element={<div>detail-page</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

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

const salesOrder: api.SalesOrder = {
  id: 'so-1',
  orderNumber: 'SAT-2026-10-13-001',
  quoteId: 'q1',
  accountId: 'acc-1',
  account,
  contactId: null,
  contact: null,
  quote: null,
  status: 'PENDING',
  createdById: 'u1',
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
};

describe('SalesOrderListPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
  });

  it('siparis yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listSalesOrders').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderSalesOrderListPage();

    expect(await screen.findByText('Henüz satış siparişi yok.')).toBeInTheDocument();
  });

  it('siparisleri listeler ve satira tiklayinca detaya gider', async () => {
    vi.spyOn(api, 'listSalesOrders').mockResolvedValue({
      data: [salesOrder],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderSalesOrderListPage();

    expect(await screen.findByText('SAT-2026-10-13-001')).toBeInTheDocument();
    expect(screen.getByText('Acme A.S.')).toBeInTheDocument();
    await user.click(screen.getByText('SAT-2026-10-13-001'));
    expect(await screen.findByText('detail-page')).toBeInTheDocument();
  });
});
