import { CalendarClock, StickyNote, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Tooltip } from '../components/ui/tooltip';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import type { AssignableUser, CalendarEvent } from '../lib/api';
import { displayEventTitle } from '../lib/calendar-event-title';
import { tr } from '../i18n/tr';

function formatRange(event: CalendarEvent): string {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: event.allDay ? undefined : 'short',
  });
  const start = formatter.format(new Date(event.startAt));
  const end = formatter.format(new Date(event.endAt));
  return start === end ? start : `${start} — ${end}`;
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

interface CalendarEventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function CalendarEventDetailModal({
  event,
  onClose,
  onEdit,
  onDelete,
  isDeleting,
}: CalendarEventDetailModalProps) {
  const assignableUsersQuery = useAssignableCalendarUsersQuery();
  const usersById = new Map<string, AssignableUser>(
    (assignableUsersQuery.data ?? []).map((u) => [u.id, u]),
  );
  // Date.now() render sirasinda dogrudan cagrilamaz (react-hooks/purity) - lazy useState
  // initializer'i istisna, bir kere mount'ta calisir (bkz. calendar-page.tsx).
  const [now] = useState(() => Date.now());
  const isPast = new Date(event.endAt).getTime() < now;

  return (
    <Modal
      title={displayEventTitle(event.title)}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            {tr.crm.calendar.detail.close}
          </Button>
          <Button variant="danger" type="button" disabled={isDeleting} onClick={onDelete}>
            {tr.crm.calendar.detail.deleteButton}
          </Button>
          <Button type="button" onClick={onEdit}>
            {tr.crm.calendar.detail.editButton}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-muted">
            <CalendarClock size={15} />
            {tr.crm.calendar.detail.whenLabel}
          </h3>
          <p className="mt-2 text-sm font-bold text-app-text">
            {formatRange(event)}
            {event.allDay && ` · ${tr.crm.calendar.allDayLabel}`}
            {isPast && ` · ${tr.crm.calendar.detail.pastBadge}`}
          </p>
        </div>

        {event.description && (
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-muted">
              <StickyNote size={15} />
              {tr.crm.calendar.detail.descriptionLabel}
            </h3>
            <p className="mt-2 text-sm whitespace-pre-wrap text-app-text">{event.description}</p>
          </div>
        )}

        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-app-muted">
            <Users size={15} />
            {tr.crm.calendar.attendeesLabel}
          </h3>
          {event.attendees.length === 0 ? (
            <p className="mt-1.5 text-sm text-app-muted">{tr.crm.calendar.detail.noAttendees}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {event.attendees.map((attendee) => {
                const user = usersById.get(attendee.userId);
                const name = user?.name ?? attendee.userId;
                const avatar = user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-app-brand/15 text-[11px] font-bold text-app-brand">
                    {initialOf(name)}
                  </span>
                );
                const content = attendee.note ? (
                  <Tooltip content={attendee.note}>
                    <span className="flex items-center gap-1.5">
                      {avatar}
                      <span className="text-xs font-semibold text-app-text">{name}</span>
                    </span>
                  </Tooltip>
                ) : (
                  <>
                    {avatar}
                    <span className="text-xs font-semibold text-app-text">{name}</span>
                  </>
                );
                return (
                  <li
                    key={attendee.id}
                    className="flex items-center gap-1.5 rounded-full bg-app-bg-muted py-1 pr-3 pl-1"
                  >
                    {content}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
