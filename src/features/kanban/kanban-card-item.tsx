import { clsx } from 'clsx';
import { CalendarDays, CircleCheck, Clock, Lock, Pencil, Trash2 } from 'lucide-react';
import type { DragEvent } from 'react';
import { ActionsMenu, type ActionsMenuItem } from '../../components/ui/actions-menu';
import { Tooltip } from '../../components/ui/tooltip';
import { tr } from '../../i18n/tr';
import type { KanbanAssignee, KanbanCard, KanbanPriority } from '../../lib/api';
import {
  KANBAN_DESCRIPTION_PREVIEW_LIMIT,
  formatDateTime,
  formatDueDate,
  initialsOf,
  isOverdue,
  truncateText,
} from './kanban-board-utils';

const t = tr.kanban;

const PRIORITY_TEXT: Record<KanbanPriority, string> = {
  LOW: 'text-sky-600 dark:text-sky-400',
  MEDIUM: 'text-amber-600 dark:text-amber-400',
  HIGH: 'text-app-danger',
};

export function KanbanAvatar({
  assignee,
  size = 'sm',
}: {
  assignee: KanbanAssignee;
  size?: 'sm' | 'md';
}) {
  const dimension = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (assignee.avatarUrl) {
    return (
      <img
        src={assignee.avatarUrl}
        alt=""
        className={clsx(dimension, 'shrink-0 rounded-full object-cover')}
      />
    );
  }
  return (
    <span
      className={clsx(
        dimension,
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        assignee.isExternal ? 'bg-app-bg-muted text-app-muted' : 'bg-app-brand/20 text-app-brand',
      )}
    >
      {initialsOf(assignee.name)}
    </span>
  );
}

interface KanbanCardItemProps {
  card: KanbanCard;
  draggable: boolean;
  isDragging: boolean;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  /** Verilirse kartin sag ustundeki mini menude "Duzenle" cikar (yetki + kilit cagiranda). */
  onEdit?: () => void;
  /** Verilirse mini menude "Sil" cikar. */
  onDelete?: () => void;
}

/** Sabit yukseklikli kart (192px = en kalabalik durum: en cok 2 satir baslik + en cok
 * 4 satir aciklama + iki satirli alt bilgi) - aciklama KANBAN_DESCRIPTION_PREVIEW_LIMIT karakterde
 * kesilir, tum kartlar ayni boyutta kalir (tam metin detay modalinda). */
export function KanbanCardItem({
  card,
  draggable,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onEdit,
  onDelete,
}: KanbanCardItemProps) {
  const isDone = card.column === 'DONE';
  const overdue = isOverdue(card);
  // Kolona gore tek bir son not: Devam Ediyor'da son revize (neyin duzeltilecegi),
  // Incelemede'de son ilerleme notu (neyin yapildigi). Gecmisin tamami detay modalinda.
  const latestNote =
    card.column === 'IN_PROGRESS' && card.revisions[0]
      ? { kind: 'revision' as const, note: card.revisions[0].note }
      : card.column === 'IN_REVIEW' && card.progressNotes[0]
        ? { kind: 'progress' as const, note: card.progressNotes[0].note }
        : null;
  const menuItems: ActionsMenuItem[] = [
    ...(onEdit ? [{ label: t.card.edit, icon: Pencil, onSelect: onEdit }] : []),
    ...(onDelete
      ? [{ label: t.card.delete, icon: Trash2, onSelect: onDelete, variant: 'danger' as const }]
      : []),
  ];
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={clsx(
        'flex h-48 flex-col rounded-lg border border-app-border bg-app-surface p-3 text-left shadow-sm transition',
        draggable ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer',
        isDragging && 'opacity-40',
        isDone && 'opacity-80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className="line-clamp-2 text-base leading-snug font-semibold text-app-text"
          title={card.title}
        >
          {card.title}
        </h3>
        {isDone && <Lock size={14} className="mt-0.5 shrink-0 text-app-muted" />}
        {!isDone && menuItems.length > 0 && (
          // Menu tiklamalari karti (detay modalini) acmasin, surukleme baslatmasin.
          <div
            className="-mt-1 -mr-1 shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            draggable
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            role="presentation"
          >
            <ActionsMenu items={menuItems} ariaLabel={t.card.menuLabel} icon={Pencil} />
          </div>
        )}
      </div>
      {/* Metin alani toplam en cok 4 satir: revize notu varsa aciklama 2 + revize 2,
          yoksa aciklama 4 satir - kart yuksekligi her durumda ayni kalir. */}
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5">
        <p
          className={clsx(
            'break-words text-justify hyphens-auto text-sm text-app-muted',
            latestNote ? 'line-clamp-2' : 'line-clamp-4',
          )}
        >
          {card.description ? truncateText(card.description, KANBAN_DESCRIPTION_PREVIEW_LIMIT) : ''}
        </p>
        {latestNote && (
          <p
            className={clsx(
              'line-clamp-2 break-words text-justify hyphens-auto text-sm',
              latestNote.kind === 'revision'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            <span className="font-semibold">
              {latestNote.kind === 'revision' ? t.card.revisionLabel : t.card.progressLabel}:
            </span>{' '}
            {latestNote.note}
          </p>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        {/* Oncelik ve bitis tarihi ayni satirda, oncelik renginde (kullanici istegi). */}
        <div
          className={clsx(
            'flex min-w-0 items-center gap-2 text-[11px] font-semibold',
            PRIORITY_TEXT[card.priority],
          )}
        >
          <span>{t.priorities[card.priority]}</span>
          {card.dueDate && (
            <span
              className="flex items-center gap-1 whitespace-nowrap"
              title={overdue ? `${t.card.dueDateLabel} · ${t.card.overdue}` : t.card.dueDateLabel}
            >
              <CalendarDays size={12} />
              {formatDueDate(card.dueDate)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Zaman bilgileri avatarin solunda alt alta: olusturulma, (tamamlandiysa) tamamlanma. */}
          <div className="flex flex-col items-end gap-0.5 text-[11px]">
            <time
              dateTime={card.createdAt}
              title={t.card.createdAtLabel}
              className="flex items-center gap-1 whitespace-nowrap text-app-muted"
            >
              <Clock size={11} className="shrink-0" />
              {formatDateTime(card.createdAt)}
            </time>
            {card.completedAt && (
              <time
                dateTime={card.completedAt}
                title={t.card.completedAtLabel}
                className="flex items-center gap-1 whitespace-nowrap font-medium text-app-success"
              >
                <CircleCheck size={11} className="shrink-0" />
                {formatDateTime(card.completedAt)}
              </time>
            )}
          </div>
          {card.assignee ? (
            <Tooltip
              content={
                card.assignee.isExternal
                  ? `${card.assignee.name} (${t.board.externalAssignee})`
                  : card.assignee.name
              }
            >
              <span className="flex" aria-label={card.assignee.name}>
                <KanbanAvatar assignee={card.assignee} />
              </span>
            </Tooltip>
          ) : (
            <span className="text-xs italic text-app-muted">{t.card.unassigned}</span>
          )}
        </div>
      </div>
    </div>
  );
}
