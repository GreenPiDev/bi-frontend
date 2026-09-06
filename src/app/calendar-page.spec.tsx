import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarPage } from './calendar-page';
import { ToastProvider } from '../components/ui/toast';
import * as api from '../lib/api';

function renderCalendarPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/ajanda']}>
          <Routes>
            <Route path="/ajanda" element={<CalendarPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'me').mockRejectedValue(new api.ApiError('UNAUTHORIZED', 'Yetkisiz.', 401));
    vi.spyOn(api, 'listAssignableCalendarUsers').mockResolvedValue([
      { id: 'user-1', name: 'Ayse Yilmaz' },
    ]);
  });

  it('ay gorunumunde hafta gunlerini gosterir', async () => {
    vi.spyOn(api, 'listCalendarEvents').mockResolvedValue([]);
    renderCalendarPage();

    expect(await screen.findAllByText('Pzt')).not.toHaveLength(0);
  });

  it('liste gorunumunde etkinlik yokken bos durum gosterir', async () => {
    vi.spyOn(api, 'listCalendarEvents').mockResolvedValue([]);
    const user = userEvent.setup();
    renderCalendarPage();

    await user.click(await screen.findByRole('button', { name: 'Liste Görünümü' }));
    expect(await screen.findByText('Bu aralıkta etkinlik yok.')).toBeInTheDocument();
  });

  it('yeni etkinlik butonu form modalini acar', async () => {
    vi.spyOn(api, 'listCalendarEvents').mockResolvedValue([]);
    const user = userEvent.setup();
    renderCalendarPage();

    await user.click(await screen.findByRole('button', { name: 'Yeni Etkinlik' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it("formu doldurup kaydedince basari toast'u gosterir ve modali kapatir", async () => {
    vi.spyOn(api, 'listCalendarEvents').mockResolvedValue([]);
    vi.spyOn(api, 'createCalendarEvent').mockResolvedValue({
      id: 'event-1',
      title: 'Yeni gorusme',
      description: null,
      startAt: '2026-09-10T09:00:00.000Z',
      endAt: '2026-09-10T10:00:00.000Z',
      allDay: false,
      createdById: 'user-1',
      attendees: [],
    });
    const user = userEvent.setup();
    renderCalendarPage();

    await user.click(await screen.findByRole('button', { name: 'Yeni Etkinlik' }));
    await user.type(await screen.findByLabelText('Başlık'), 'Yeni gorusme');
    await user.type(screen.getByLabelText('Başlangıç'), '2026-09-10T09:00');
    await user.type(screen.getByLabelText('Bitiş'), '2026-09-10T10:00');
    await user.click(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Etkinlik oluşturuldu.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('liste gorunumunde etkinlikleri gosterir', async () => {
    vi.spyOn(api, 'listCalendarEvents').mockResolvedValue([
      {
        id: 'event-1',
        title: 'Musteri ziyareti',
        description: null,
        startAt: '2026-09-10T10:00:00.000Z',
        endAt: '2026-09-10T11:00:00.000Z',
        allDay: false,
        createdById: 'user-1',
        attendees: [{ id: 'att-1', userId: 'user-1', note: null }],
      },
    ]);
    const user = userEvent.setup();
    renderCalendarPage();

    await user.click(await screen.findByRole('button', { name: 'Liste Görünümü' }));
    expect(await screen.findByText('Musteri ziyareti')).toBeInTheDocument();
  });
});
