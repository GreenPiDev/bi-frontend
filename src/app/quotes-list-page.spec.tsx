import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QuotesListPage } from './quotes-list-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/teklifler']}>
          <Routes>
            <Route path="/teklifler" element={<QuotesListPage />} />
            <Route path="/teklifler/yeni" element={<div>new-page</div>} />
            <Route path="/teklifler/:id" element={<div>detail-page</div>} />
            <Route path="/siparisler/:id" element={<div>purchase-order-detail-page</div>} />
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
};

function makeQuote(overrides: Partial<api.Quote>): api.Quote {
  return {
    id: 'q1',
    quoteNumber: 'TEK-2026-09-07-001',
    accountId: 'acc-1',
    account,
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
    status: 'DRAFT',
    approvedAt: null,
    approvedById: null,
    createdById: 'u1',
    items: [],
    opportunity: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const companyAdminUser: api.AuthenticatedUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'admin@test.com',
  name: 'Admin',
  roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
  isPlatformAdmin: false,
  avatarUrl: null,
  permissions: { isCompanyAdmin: true, permissions: [] },
};

describe('QuotesListPage', () => {
  it('teklif yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
    });
    renderPage();

    expect(await screen.findByText('Henüz teklif kaydı yok.')).toBeInTheDocument();
  });

  it('onayli teklif satirinda siparis olustur butonu gosterilir, taslak satirda gosterilmez', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(companyAdminUser);
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [
        makeQuote({ id: 'q-approved', quoteNumber: 'TEK-A', status: 'APPROVED' }),
        makeQuote({ id: 'q-draft', quoteNumber: 'TEK-B', status: 'DRAFT' }),
      ],
      meta: { page: 1, pageSize: 25, total: 2, totalPages: 1 },
    });
    renderPage();

    await screen.findByText('TEK-A');
    const buttons = screen.getAllByRole('button', { name: 'Satın Alma Siparişi Oluştur' });
    expect(buttons).toHaveLength(1);
  });

  it('siparis olustur butonuna tiklayinca siparis olusturulur ve detayina gidilir', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(companyAdminUser);
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [makeQuote({ id: 'q-approved', quoteNumber: 'TEK-A', status: 'APPROVED' })],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const createSpy = vi.spyOn(api, 'createPurchaseOrderFromQuote').mockResolvedValue({
      id: 'po-1',
      orderNumber: 'SIP-2026-09-07-001',
      quoteId: 'q-approved',
      quote: makeQuote({ id: 'q-approved', quoteNumber: 'TEK-A', status: 'APPROVED' }),
      projectId: null,
      project: null,
      status: 'DRAFT',
      createdById: 'u1',
      items: [],
      createdAt: '2026-09-07T00:00:00.000Z',
      updatedAt: '2026-09-07T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Satın Alma Siparişi Oluştur' });
    await user.click(button);

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith('q-approved'));
    expect(await screen.findByText('purchase-order-detail-page')).toBeInTheDocument();
  });
});
