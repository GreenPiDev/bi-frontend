import { Modal } from '../components/ui/modal';
import type { CalendarEvent } from '../lib/api';
import { displayEventTitle } from '../lib/calendar-event-title';
import { tr } from '../i18n/tr';

function formatTime(event: CalendarEvent): string {
  if (event.allDay) {
    return tr.crm.calendar.allDayLabel;
  }
  return new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short' }).format(new Date(event.startAt));
}

interface CalendarDayEventsModalProps {
  day: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function CalendarDayEventsModal({
  day,
  events,
  onClose,
  onSelectEvent,
}: CalendarDayEventsModalProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const title = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(day);

  return (
    <Modal title={title} onClose={onClose}>
      {sortedEvents.length === 0 ? (
        <p className="text-sm text-app-muted">{tr.crm.calendar.dayEventsModal.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sortedEvents.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(event)}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-app-bg-muted"
              >
                <span className="w-16 shrink-0 text-xs font-semibold text-app-muted">
                  {formatTime(event)}
                </span>
                <span className="truncate text-sm font-semibold text-app-text">
                  {displayEventTitle(event.title)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
