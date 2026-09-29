import { clsx } from 'clsx';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from './app-shell';
import { CalendarDayEventsModal } from './calendar-day-events-modal';
import { CalendarEventDetailModal } from './calendar-event-detail-modal';
import { CalendarEventFormModal } from './calendar-event-form-modal';
import { CalendarInviteRespondModal } from './calendar-invite-respond-modal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { CircleIconButton } from '../components/ui/circle-icon-button';
import { PageHelp } from '../components/ui/page-help';
import { Table } from '../components/ui/table';
import { TruncatedText } from '../components/ui/truncated-text';
import { useToast } from '../components/ui/toast-context';
import { useMeQuery } from '../features/auth/use-auth';
import {
  useCalendarEventsQuery,
  useDeleteCalendarEventMutation,
  usePendingCalendarInvitesQuery,
  useRespondToCalendarEventMutation,
  useSentCalendarInvitesQuery,
} from '../features/crm/use-calendar-events';
import { useCalendarsSharedWithMeQuery } from '../features/crm/use-calendar-shares';
import {
  ApiError,
  type CalendarAttendeeStatus,
  type CalendarEvent,
  type PendingCalendarInvite,
  type SentCalendarInvite,
} from '../lib/api';
import { displayEventTitle } from '../lib/calendar-event-title';
import { getCalendarEventVisibility } from '../lib/calendar-event-visibility';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<CalendarAttendeeStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'danger',
};

const STATUS_LABEL: Record<CalendarAttendeeStatus, string> = {
  PENDING: tr.crm.calendar.statusPending,
  ACCEPTED: tr.crm.calendar.statusAccepted,
  DECLINED: tr.crm.calendar.statusDeclined,
};

const CHIP_CLASS_BY_VISIBILITY: Record<'private' | 'assigned' | 'shared', string> = {
  private: 'bg-violet-500/10 text-violet-700 hover:bg-violet-500/20',
  assigned: 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20',
  shared: 'bg-app-brand/10 text-app-brand hover:bg-app-brand/20',
};

const ROW_CLASS_BY_VISIBILITY: Record<'private' | 'assigned' | 'shared', string | undefined> = {
  private: 'bg-violet-50 hover:bg-violet-100',
  assigned: 'bg-amber-50 hover:bg-amber-100',
  shared: undefined,
};

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
  const [dayEventsFor, setDayEventsFor] = useState<Date | null>(null);
  const [respondingInvite, setRespondingInvite] = useState<{
    invite: PendingCalendarInvite;
    mode: 'ACCEPT' | 'DECLINE';
  } | null>(null);
  const toast = useToast();
  const deleteMutation = useDeleteCalendarEventMutation();
  const pendingInvitesQuery = usePendingCalendarInvitesQuery();
  const sentInvitesQuery = useSentCalendarInvitesQuery();
  const respondMutation = useRespondToCalendarEventMutation();
  const meQuery = useMeQuery();
  const currentUserId = meQuery.data?.id;
  const sharedWithMeQuery = useCalendarsSharedWithMeQuery();
  const [viewedUserId, setViewedUserId] = useState<string | undefined>(undefined);
  // currentUserId sonradan gelir (meQuery async) - dropdown'in varsayilan degeri icin.
  const selectedUserId = viewedUserId ?? currentUserId;
  // Date.now() render sirasinda dogrudan cagrilamaz (react-hooks/purity) - lazy useState
  // initializer'i istisna, bir kere mount'ta calisir.
  const [now] = useState(() => Date.now());

  const { from, to } = useMemo(() => getMonthGridRange(monthCursor), [monthCursor]);
  const viewedUserQueryParam =
    selectedUserId && selectedUserId !== currentUserId ? selectedUserId : undefined;
  const monthQuery = useCalendarEventsQuery(
    viewMode === 'month'
      ? {
          from: from.toISOString(),
          to: to.toISOString(),
          order: 'asc',
          userId: viewedUserQueryParam,
        }
      : { order: 'asc', userId: viewedUserQueryParam },
  );

  const viewerOptions = [
    ...(currentUserId ? [{ value: currentUserId, label: tr.crm.calendar.viewerSelfOption }] : []),
    ...(sharedWithMeQuery.data ?? []).map((user) => ({
      value: user.id,
      label: user.name,
    })),
  ];

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

  function handleRespondConfirm(responseNote: string | undefined) {
    if (!respondingInvite) return;
    const { invite, mode } = respondingInvite;
    respondMutation.mutate(
      {
        eventId: invite.eventId,
        input: { status: mode === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', responseNote },
      },
      {
        onSuccess: () => {
          toast.success(
            mode === 'ACCEPT'
              ? tr.crm.calendar.pendingInvites.acceptSuccess
              : tr.crm.calendar.pendingInvites.declineSuccess,
          );
          setRespondingInvite(null);
        },
        onError: (error) => {
          toast.error(
            error instanceof ApiError ? error.message : tr.crm.calendar.pendingInvites.respondError,
          );
        },
      },
    );
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
          <Link
            to="/profile?tab=security"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-app-brand hover:underline"
          >
            {tr.crm.calendar.sharingHint}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                CHIP_CLASS_BY_VISIBILITY.private,
              )}
            >
              {tr.crm.calendar.legendPrivate}
            </span>
            <span
              className={clsx(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                CHIP_CLASS_BY_VISIBILITY.assigned,
              )}
            >
              {tr.crm.calendar.legendAssigned}
            </span>
            <span
              className={clsx(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                CHIP_CLASS_BY_VISIBILITY.shared,
              )}
            >
              {tr.crm.calendar.legendShared}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {currentUserId && (
            <select
              aria-label={tr.crm.calendar.viewerLabel}
              value={selectedUserId ?? ''}
              onChange={(event) => setViewedUserId(event.target.value)}
              className="h-11 rounded-xl border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text outline-none focus:border-app-primary"
            >
              {viewerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
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

      {(pendingInvitesQuery.data?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-app-text">
            {tr.crm.calendar.pendingInvites.title}
          </h2>
          <Table<PendingCalendarInvite>
            columns={[
              {
                key: 'creatorName',
                header: tr.crm.calendar.pendingInvites.senderColumn,
                render: (invite) => (
                  <span className="text-sm text-app-text">{invite.creatorName}</span>
                ),
              },
              {
                key: 'startAt',
                header: tr.crm.calendar.pendingInvites.dateColumn,
                render: (invite) => (
                  <span className="text-xs text-app-muted">
                    {new Intl.DateTimeFormat('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: invite.allDay ? undefined : 'short',
                    }).format(new Date(invite.startAt))}
                  </span>
                ),
              },
              {
                key: 'eventTitle',
                header: tr.crm.calendar.pendingInvites.titleColumn,
                render: (invite) => (
                  <span className="text-sm font-semibold text-app-text">
                    {displayEventTitle(invite.eventTitle)}
                  </span>
                ),
              },
              {
                key: 'eventDescription',
                header: tr.crm.calendar.pendingInvites.descriptionColumn,
                render: (invite) =>
                  invite.eventDescription ? (
                    <TruncatedText
                      text={invite.eventDescription}
                      modalTitle={tr.crm.calendar.pendingInvites.descriptionColumn}
                    />
                  ) : (
                    <span className="text-app-muted">
                      {tr.crm.calendar.pendingInvites.noDescription}
                    </span>
                  ),
              },
              {
                key: 'actions',
                header: tr.crm.calendar.pendingInvites.actionsColumn,
                render: (invite) => (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={respondMutation.isPending}
                      onClick={() => setRespondingInvite({ invite, mode: 'DECLINE' })}
                    >
                      {tr.crm.calendar.pendingInvites.declineButton}
                    </Button>
                    <Button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => setRespondingInvite({ invite, mode: 'ACCEPT' })}
                    >
                      {tr.crm.calendar.pendingInvites.acceptButton}
                    </Button>
                  </div>
                ),
              },
            ]}
            data={pendingInvitesQuery.data ?? []}
            keyField={(invite) => invite.attendeeId}
            isLoading={pendingInvitesQuery.isPending}
            loadingMessage={tr.crm.calendar.loading}
            emptyMessage={tr.crm.calendar.pendingInvites.empty}
          />
        </div>
      )}

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
                    'group relative flex min-h-24 flex-col gap-1 bg-app-surface p-1.5 text-left align-top',
                    !isCurrentMonth && 'bg-app-bg text-app-muted',
                    isSameDay(day, new Date()) && 'ring-2 ring-inset ring-app-brand',
                  )}
                >
                  {dayEvents.length > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setDayEventsFor(day);
                      }}
                      className="absolute top-1 right-1 hidden cursor-pointer rounded bg-app-surface px-1 text-[11px] font-semibold text-app-brand hover:underline group-hover:block"
                    >
                      {tr.crm.calendar.showAllLabel}
                    </span>
                  )}
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
                      className={clsx(
                        'truncate rounded px-1.5 py-0.5 text-[11px] font-semibold',
                        CHIP_CLASS_BY_VISIBILITY[getCalendarEventVisibility(event, selectedUserId)],
                      )}
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
            new Date(event.endAt).getTime() < now
              ? 'bg-red-50 hover:bg-red-100'
              : ROW_CLASS_BY_VISIBILITY[getCalendarEventVisibility(event, selectedUserId)]
          }
        />
      )}

      {(sentInvitesQuery.data?.length ?? 0) > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold text-app-text">
            {tr.crm.calendar.sentInvites.title}
          </h2>
          <Table<SentCalendarInvite>
            columns={[
              {
                key: 'eventTitle',
                header: tr.crm.calendar.sentInvites.eventColumn,
                render: (invite) => (
                  <span className="text-sm font-semibold text-app-text">
                    {displayEventTitle(invite.eventTitle)}
                  </span>
                ),
              },
              {
                key: 'attendeeName',
                header: tr.crm.calendar.sentInvites.recipientColumn,
                render: (invite) => (
                  <span className="text-sm text-app-text">{invite.attendeeName}</span>
                ),
              },
              {
                key: 'status',
                header: tr.crm.calendar.sentInvites.statusColumn,
                render: (invite) => (
                  <Badge variant={STATUS_BADGE_VARIANT[invite.status]}>
                    {STATUS_LABEL[invite.status]}
                  </Badge>
                ),
              },
              {
                key: 'responseNote',
                header: tr.crm.calendar.sentInvites.noteColumn,
                render: (invite) =>
                  invite.responseNote ? (
                    <TruncatedText
                      text={invite.responseNote}
                      modalTitle={tr.crm.calendar.sentInvites.noteModalTitle}
                    />
                  ) : (
                    <span className="text-app-muted">{tr.crm.calendar.sentInvites.noNote}</span>
                  ),
              },
              {
                key: 'startAt',
                header: tr.crm.calendar.sentInvites.dateColumn,
                render: (invite) => (
                  <span className="text-xs text-app-muted">
                    {new Intl.DateTimeFormat('tr-TR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(invite.startAt))}
                  </span>
                ),
              },
            ]}
            data={sentInvitesQuery.data ?? []}
            keyField={(invite) => invite.attendeeId}
            isLoading={sentInvitesQuery.isPending}
            loadingMessage={tr.crm.calendar.loading}
            emptyMessage={tr.crm.calendar.sentInvites.empty}
          />
        </div>
      )}

      {respondingInvite && (
        <CalendarInviteRespondModal
          mode={respondingInvite.mode}
          isPending={respondMutation.isPending}
          onConfirm={handleRespondConfirm}
          onCancel={() => setRespondingInvite(null)}
        />
      )}

      {dayEventsFor && (
        <CalendarDayEventsModal
          day={dayEventsFor}
          events={eventsOnDay(events, dayEventsFor)}
          onClose={() => setDayEventsFor(null)}
          onSelectEvent={(event) => {
            setDayEventsFor(null);
            setSelectedEvent(event);
          }}
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
