import { clsx } from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppShell } from './app-shell';
import { CalendarEventDetailModal } from './calendar-event-detail-modal';
import { CalendarEventFormModal } from './calendar-event-form-modal';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { PageHelp } from '../components/ui/page-help';
import { Table } from '../components/ui/table';
import { useToast } from '../components/ui/toast-context';
import {
  useCalendarEventsQuery,
  useDeleteCalendarEventMutation,
} from '../features/crm/use-calendar-events';
import { ApiError, type CalendarEvent } from '../lib/api';
import { displayEventTitle } from '../lib/calendar-event-title';
import { tr } from '../i18n/tr';

type ViewMode = 'month' | 'list';

/** T1: takvim esas - ay gorunumu Pazartesi baslangicli, 6 haftalik sabit izgara. */
function getMonthGridRange(monthStart: Date): { from: Date; to: Date } {
  const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Pazartesi
  const from = new Date(firstOfMonth);
  from.setDate(from.getDate() - firstWeekday);
  const to = new Date(from);
  to.setDate(to.getDate() + 41); // 6 hafta x 7 gun - 1
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function buildGridDays(from: Date): Date[] {
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(from);
    day.setDate(day.getDate() + index);
    return day;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    return (
      start <= new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59) &&
      end >= new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0)
    );
  });
}

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [creatingAt, setCreatingAt] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();
  const deleteMutation = useDeleteCalendarEventMutation();
  // Date.now() render sirasinda dogrudan cagrilamaz (react-hooks/purity) - lazy useState
  // initializer'i istisna, bir kere mount'ta calisir.
  const [now] = useState(() => Date.now());

  const { from, to } = useMemo(() => getMonthGridRange(monthCursor), [monthCursor]);
  const monthQuery = useCalendarEventsQuery(
    viewMode === 'month'
      ? { from: from.toISOString(), to: to.toISOString(), order: 'asc' }
      : { order: 'asc' },
  );

  const gridDays = useMemo(() => buildGridDays(from), [from]);
  const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(
    monthCursor,
  );

  function openCreateModal(defaultStart?: Date) {
    setEditingEvent(null);
    setCreatingAt(defaultStart ?? null);
    setShowForm(true);
  }

  function openEditModal(event: CalendarEvent) {
    setSelectedEvent(null);
    setEditingEvent(event);
    setShowForm(true);
  }

  function handleDelete(event: CalendarEvent) {
    if (!window.confirm(tr.crm.calendar.deleteConfirm)) {
      return;
    }
    deleteMutation.mutate(event.id, {
      onSuccess: () => setSelectedEvent(null),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.crm.calendar.deleteError);
      },
    });
  }

  const events = monthQuery.data ?? [];
  const listEvents = useMemo(() => {
    if (viewMode !== 'list') return events;
    const upcoming = events.filter((event) => new Date(event.endAt).getTime() >= now);
    const past = events.filter((event) => new Date(event.endAt).getTime() < now);
    return [...upcoming, ...past];
  }, [events, viewMode, now]);

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-app-text">{tr.crm.calendar.title}</h1>
            <PageHelp text={tr.help.calendar} />
          </div>
          <p className="mt-1 text-sm text-app-muted">{tr.crm.calendar.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <CircleIconButton
            icon={CalendarDays}
            tooltip={tr.crm.calendar.monthView}
            aria-pressed={viewMode === 'month'}
            onClick={() => setViewMode('month')}
          >
            {viewMode === 'month' && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-app-success" />
            )}
          </CircleIconButton>
          <CircleIconButton
            icon={List}
            tooltip={tr.crm.calendar.listView}
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            {viewMode === 'list' && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-app-success" />
            )}
          </CircleIconButton>
          <CircleIconButton
            icon={Plus}
            tooltip={tr.crm.calendar.newButton}
            variant="success"
            strokeWidth={3}
            onClick={() => openCreateModal()}
          />
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Onceki ay"
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg-muted"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-app-text capitalize">{monthLabel}</span>
              <Button variant="secondary" type="button" onClick={() => setMonthCursor(new Date())}>
                {tr.crm.calendar.today}
              </Button>
            </div>
            <button
              type="button"
              aria-label="Sonraki ay"
              className="rounded-lg p-2 text-app-muted hover:bg-app-bg-muted"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-app-border bg-app-border text-xs font-semibold text-app-muted">
            {tr.crm.calendar.weekdays.map((weekday) => (
              <div key={weekday} className="bg-app-surface px-2 py-1.5 text-center">
                {weekday}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border-x border-b border-app-border bg-app-border">
            {gridDays.map((day) => {
              const dayEvents = eventsOnDay(events, day);
              const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() =>
                    openCreateModal(
                      new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0, 0),
                    )
                  }
                  className={clsx(
                    'flex min-h-24 flex-col gap-1 bg-app-surface p-1.5 text-left align-top',
                    !isCurrentMonth && 'bg-app-bg text-app-muted',
                    isSameDay(day, new Date()) && 'ring-2 ring-inset ring-app-brand',
                  )}
                >
                  <span className="text-xs font-semibold">{day.getDate()}</span>
                  {dayEvents.map((event) => (
                    <span
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="truncate rounded bg-app-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-app-brand hover:bg-app-brand/20"
                    >
                      {displayEventTitle(event.title)}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <Table<CalendarEvent>
          columns={[
            {
              key: 'title',
              header: tr.crm.calendar.listColumnTitle,
              render: (event) => (
                <span className="text-sm font-semibold text-app-text">
                  {displayEventTitle(event.title)}
                </span>
              ),
            },
            {
              key: 'startAt',
              header: tr.crm.calendar.listColumnDate,
              render: (event) => (
                <span className="text-xs text-app-muted">
                  {new Intl.DateTimeFormat('tr-TR', {
                    dateStyle: 'medium',
                    timeStyle: event.allDay ? undefined : 'short',
                  }).format(new Date(event.startAt))}
                </span>
              ),
            },
          ]}
          data={listEvents}
          keyField={(event) => event.id}
          onRowClick={(event) => setSelectedEvent(event)}
          isLoading={monthQuery.isPending}
          loadingMessage={tr.crm.calendar.loading}
          emptyMessage={tr.crm.calendar.empty}
          rowClassName={(event) =>
            new Date(event.endAt).getTime() < now ? 'bg-red-50 hover:bg-red-100' : undefined
          }
        />
      )}

      {selectedEvent && (
        <CalendarEventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEditModal(selectedEvent)}
          onDelete={() => handleDelete(selectedEvent)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {showForm && (
        <CalendarEventFormModal
          event={editingEvent ?? undefined}
          defaultStart={creatingAt ?? undefined}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppShell>
  );
}
