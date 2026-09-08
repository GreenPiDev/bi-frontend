import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingWidget } from './messaging-widget';
import { ToastProvider } from '../../components/ui/toast';
import * as api from '../../lib/api';

const ME: api.AuthenticatedUser = {
  id: 'user-me',
  tenantId: 'tenant-a',
  email: 'me@example.com',
  name: 'Ben',
  roles: [{ id: 'r1', name: 'COMPANYADMIN' }],
  isPlatformAdmin: false,
  avatarUrl: null,
  permissions: { isCompanyAdmin: true, permissions: [] },
};

function renderWidget() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <MessagingWidget />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('MessagingWidget', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockResolvedValue(ME);
    vi.spyOn(api, 'listAssignableMessageUsers').mockResolvedValue([
      { id: 'user-other', name: 'Diğer Kullanıcı' },
    ]);
    vi.spyOn(api, 'listMessages').mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          senderId: 'user-other',
          body: 'Merhaba, teklifi inceledin mi?',
          sentAt: '2026-01-01T10:00:00.000Z',
          relatedEntity: null,
          relatedEntityId: null,
          recipients: [{ id: 'rec-1', userId: 'user-me', kind: 'TO', readAt: null }],
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    vi.spyOn(api, 'getMessage').mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-other',
      body: 'Merhaba, teklifi inceledin mi?',
      sentAt: '2026-01-01T10:00:00.000Z',
      relatedEntity: null,
      relatedEntityId: null,
      recipients: [{ id: 'rec-1', userId: 'user-me', kind: 'TO', readAt: null }],
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
    vi.spyOn(api, 'markMessageRead').mockResolvedValue(undefined);
  });

  it('varsayilan olarak daralti durumdadir, baslik gorunur ama liste gorunmez', async () => {
    renderWidget();
    expect(await screen.findByText('Mesajlaşma')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Mesaj ara...')).not.toBeInTheDocument();
  });

  it('genislet butonuna tiklayinca mesaj listesi gorunur', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('button', { name: 'Genişlet' }));
    expect(await screen.findByText('Diğer Kullanıcı')).toBeInTheDocument();
  });

  it('bir mesaja tiklayinca sohbet penceresi acilir ve okundu isaretlenir', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('button', { name: 'Genişlet' }));
    await user.click(await screen.findByText('Diğer Kullanıcı'));

    expect(await screen.findAllByText('Merhaba, teklifi inceledin mi?')).toHaveLength(2);
    expect(api.markMessageRead).toHaveBeenCalledWith('msg-1');
  });

  it('sohbet penceresini kapat butonu kapatir', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('button', { name: 'Genişlet' }));
    await user.click(await screen.findByText('Diğer Kullanıcı'));
    await screen.findAllByText('Merhaba, teklifi inceledin mi?');
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Kapat' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Kapat' }));
  });

  it('yeni mesaj butonu formu acar', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('button', { name: 'Yeni mesaj' }));
    expect(screen.getByRole('dialog', { name: 'Yeni Mesaj' })).toBeInTheDocument();
  });
});
