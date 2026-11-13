import { clsx } from 'clsx';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge';
import { CollapsibleSection } from '../components/ui/collapsible-section';
import { Modal } from '../components/ui/modal';
import { formatDateTime, formatDueDate, isOverdue } from '../features/kanban/kanban-board-utils';
import { KanbanAvatar } from '../features/kanban/kanban-card-item';
import { tr } from '../i18n/tr';
import type { KanbanCard, KanbanCardNote } from '../lib/api';

const t = tr.kanban.card;

/** Salt-okunur detay - duzenle/sil kartin sag ustundeki mini menude (kanban-card-item.tsx),
 * kapatma modal basligindaki X / Esc ile. */
interface KanbanCardDetailModalProps {
  card: KanbanCard;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-app-muted">{label}</dt>
      <dd className="text-sm text-app-text">{children}</dd>
    </div>
  );
}

interface KanbanNoteHistoryProps {
  notes: KanbanCardNote[];
  heading: string;
  itemTitle: (order: number, author: string, at: string) => string;
  accentClassName: string;
}

/** Revize/ilerleme gecmisi: her not tek satir basligi (sira · yazan · tarih) olan bir
 * collapsible; en yeni once gelir, numara kronolojiktir (ilk not = 1), hepsi kapali baslar. */
function KanbanNoteHistory({ notes, heading, itemTitle, accentClassName }: KanbanNoteHistoryProps) {
  if (notes.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={clsx('text-xs font-semibold', accentClassName)}>{heading}</h3>
      {notes.map((note, index) => (
        <CollapsibleSection
          key={note.id}
          title={itemTitle(
            notes.length - index,
            note.authorName ?? t.unknownAuthor,
            formatDateTime(note.createdAt),
          )}
        >
          <p className="whitespace-pre-wrap break-words text-justify hyphens-auto text-sm text-app-text">
            {note.note}
          </p>
        </CollapsibleSection>
      ))}
    </section>
  );
}

export function KanbanCardDetailModal({ card, onClose }: KanbanCardDetailModalProps) {
  const isDone = card.column === 'DONE';
  const overdue = isOverdue(card);
  return (
    <Modal title={card.title} width="md" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {isDone && (
          <div className="flex items-center gap-2 rounded-lg bg-app-bg-muted px-3 py-2 text-xs text-app-muted">
            <Lock size={14} />
            {t.lockedNotice}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-justify hyphens-auto text-sm text-app-text">
          {card.description || <span className="text-app-muted">{t.noDescription}</span>}
        </p>
        <KanbanNoteHistory
          notes={card.revisions}
          heading={t.revisionHistoryTitle(card.revisions.length)}
          itemTitle={t.revisionItemTitle}
          accentClassName="text-orange-600 dark:text-orange-400"
        />
        <KanbanNoteHistory
          notes={card.progressNotes}
          heading={t.progressHistoryTitle(card.progressNotes.length)}
          itemTitle={t.progressItemTitle}
          accentClassName="text-emerald-600 dark:text-emerald-400"
        />
        <dl className="grid grid-cols-2 gap-3 border-t border-app-border pt-4">
          <DetailRow label={t.assigneeLabel}>
            {card.assignee ? (
              <span className="flex items-center gap-2">
                <KanbanAvatar assignee={card.assignee} size="md" />
                <span>
                  {card.assignee.name}
                  {card.assignee.isExternal && (
                    <span className="block text-xs text-app-muted">
                      {tr.kanban.board.externalAssignee}
                    </span>
                  )}
                </span>
              </span>
            ) : (
              <span className="text-app-muted">{t.unassigned}</span>
            )}
          </DetailRow>
          <DetailRow label={t.statusLabel}>
            <Badge variant={isDone ? 'success' : 'neutral'}>{tr.kanban.columns[card.column]}</Badge>
          </DetailRow>
          <DetailRow label={t.priorityLabel}>{tr.kanban.priorities[card.priority]}</DetailRow>
          <DetailRow label={t.dueDateLabel}>
            {card.dueDate ? (
              <span className={clsx(overdue && 'font-semibold text-app-danger')}>
                {formatDueDate(card.dueDate)}
                {overdue && ` · ${t.overdue}`}
              </span>
            ) : (
              '-'
            )}
          </DetailRow>
          <DetailRow label={t.createdAtLabel}>{formatDateTime(card.createdAt)}</DetailRow>
          {card.completedAt && (
            <DetailRow label={t.completedAtLabel}>{formatDateTime(card.completedAt)}</DetailRow>
          )}
        </dl>
      </div>
    </Modal>
  );
}
