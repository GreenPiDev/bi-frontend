import { clsx } from 'clsx';
import { CalendarClock, Lock, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../components/ui/tooltip';
import { NOTE_COLOR_STYLES } from '../features/home/note-colors';
import type { Note } from '../lib/api';
import { tr } from '../i18n/tr';

const EXIT_ANIMATION_MS = 140;

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });
const reminderFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}

/** Notun sag-ust "duzenle" ikonu - tiklaninca Duzenle/Sil secenekleri acilan mini menu.
 * export-menu-button.tsx'teki disari-tiklama-ile-kapat + ertelemeli cikis animasyonu
 * deseninin ayni kopyasi. */
function NoteCardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = tr.home.notes;

  function requestClose() {
    if (!isOpen) return;
    setIsClosing(true);
  }

  useEffect(() => {
    if (!isClosing) return;
    const timeoutId = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isClosing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsClosing(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={t.editMenuLabel}
        onClick={() => (isOpen ? requestClose() : setIsOpen(true))}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-app-text/50 transition-colors hover:bg-black/5 hover:text-app-text"
      >
        <Pencil size={14} />
      </button>

      {isOpen && (
        <div
          className={clsx(
            'absolute top-full right-0 z-20 mt-1 w-32 origin-top-right overflow-hidden rounded-lg border border-app-border bg-app-surface py-1 shadow-lg',
            isClosing ? 'animate-export-menu-out' : 'animate-export-menu-in',
          )}
        >
          <button
            type="button"
            onClick={() => {
              requestClose();
              onEdit();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-app-text hover:bg-app-bg-muted"
          >
            <Pencil size={14} />
            {t.editAction}
          </button>
          <button
            type="button"
            onClick={() => {
              requestClose();
              onDelete();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-app-danger hover:bg-app-bg-muted"
          >
            <Trash2 size={14} />
            {t.deleteAction}
          </button>
        </div>
      )}
    </div>
  );
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  return (
    <div
      className={clsx(
        'flex min-h-40 flex-col justify-between gap-3 rounded-lg border p-4 shadow-sm',
        NOTE_COLOR_STYLES[note.color].cardClassName,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-app-text/60">
          {dateFormatter.format(new Date(note.createdAt))}
          {note.isPrivate && (
            <Tooltip content={tr.home.notes.privateIndicator}>
              <Lock size={11} className="shrink-0" />
            </Tooltip>
          )}
        </span>
        <NoteCardMenu onEdit={onEdit} onDelete={onDelete} />
      </div>

      <p className="flex-1 whitespace-pre-wrap text-sm text-app-text">{note.content}</p>

      {note.reminder && (
        <Link
          to={`/ajanda?eventId=${note.reminder.id}`}
          className="flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1.5 text-xs text-app-text/80 transition-colors hover:bg-black/10"
        >
          <CalendarClock size={14} className="shrink-0" />
          <span className="truncate font-semibold">{note.reminder.title}</span>
          <span className="shrink-0 whitespace-nowrap">
            {reminderFormatter.format(new Date(note.reminder.startAt))}
          </span>
        </Link>
      )}
    </div>
  );
}
