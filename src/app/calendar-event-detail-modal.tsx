import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { useAssignableCalendarUsersQuery } from '../features/crm/use-calendar-events';
import type { CalendarEvent } from '../lib/api';
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
  const usersById = new Map((assignableUsersQuery.data ?? []).map((u) => [u.id, u.name]));

  return (
    <Modal
      title={event.title}
      subtitle={formatRange(event)}
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
        {event.description && (
          <p className="text-sm whitespace-pre-wrap text-app-text">{event.description}</p>
        )}
        <div>
          <h3 className="text-sm font-semibold text-app-muted">{tr.crm.calendar.attendeesLabel}</h3>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {event.attendees.map((attendee) => (
              <li
                key={attendee.id}
                className="rounded-full bg-app-bg-muted px-2.5 py-1 text-xs font-semibold text-app-text"
              >
                {usersById.get(attendee.userId) ?? attendee.userId}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
