import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewMessageModal } from './new-message-modal';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderModal() {
  const queryClient = new QueryClient();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NewMessageModal onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onClose };
}

describe('NewMessageModal', () => {
  it('ilişkili kayıt türü/kaydı seçilmeden gönderim yapılabilir (serbest mesaj)', async () => {
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-1', name: 'Ali Veli', avatarUrl: null },
    ]);
    renderModal();

    expect(await screen.findByLabelText('Kayıt Türü')).toBeInTheDocument();
    expect(screen.queryByLabelText('İlişkili Kayıt')).not.toBeInTheDocument();
  });

  it('teklif seçilince yanında detayı yeni sekmede açan bir bağlantı görünür', async () => {
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-1', name: 'Ali Veli', avatarUrl: null },
    ]);
    vi.spyOn(api, 'listQuotes').mockResolvedValue({
      data: [
        {
          id: 'quote-1',
          quoteNumber: 'TEK-2026-01-01-001',
          account: { id: 'acc-1', name: 'ACME' },
        } as never,
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(await screen.findByLabelText('Kayıt Türü'), 'QUOTE');
    await user.selectOptions(await screen.findByLabelText('İlişkili Kayıt'), 'quote-1');

    const link = await screen.findByRole('link', {
      name: 'Kaydın detaylarını yeni sekmede incele',
    });
    expect(link).toHaveAttribute('href', '/teklifler/quote-1');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
