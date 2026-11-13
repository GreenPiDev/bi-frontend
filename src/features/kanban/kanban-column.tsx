import { clsx } from 'clsx';
import { Plus, Search, X } from 'lucide-react';
import type { DragEvent } from 'react';
import { tr } from '../../i18n/tr';
import type { KanbanCard, KanbanColumn as KanbanColumnKey } from '../../lib/api';
import { KanbanCardItem } from './kanban-card-item';

const t = tr.kanban;

/** Kolon zemini sayfa arka planindan (app-bg) belirgin sekilde ayrilsin diye her
 * kolon kendi durum renginde hafif bir ton tasir; beyaz kartlar bu
 * zeminde one cikar. */
const COLUMN_SURFACE: Record<KanbanColumnKey, string> = {
  TODO: 'bg-slate-200/70 dark:bg-slate-800/60',
  IN_PROGRESS: 'bg-sky-100/80 dark:bg-sky-950/50',
  IN_REVIEW: 'bg-amber-100/70 dark:bg-amber-950/40',
  DONE: 'bg-emerald-100/70 dark:bg-emerald-950/40',
};

export interface DropTarget {
  column: KanbanColumnKey;
  /** Surukleneni haric gorunen kartlar icindeki hedef sira. */
  index: number;
}

interface KanbanColumnProps {
  column: KanbanColumnKey;
  cards: KanbanCard[];
  totalCount: number;
  draggingCardId: string | null;
  dropTarget: DropTarget | null;
  canDrag: boolean;
  /** Bu kolon surukleneni kabul ediyor mu (Done'dan cikis yok, ayni yere birakma yok). */
  acceptsDrop: boolean;
  onAddCard?: () => void;
  onOpenCard: (card: KanbanCard) => void;
  /** Verilmezse (yetki yoksa) kart menusunde ilgili secenek cikmaz. */
  onEditCard?: (card: KanbanCard) => void;
  onDeleteCard?: (card: KanbanCard) => void;
  onDragStartCard: (card: KanbanCard) => void;
  onDragEnd: () => void;
  onDragOverTarget: (target: DropTarget) => void;
  onDrop: () => void;
  /** Kolon arama kutusunun degeri - filtreleme sayfada yapilir (tum kartlar zaten
   * yuklu, backend'e istek gitmez; surukle-birak indeksi gorunen kartlarla tutarli kalir). */
  searchValue: string;
  onSearchChange: (query: string) => void;
  /** Arama aktifken bos kolon mesaji "eslesen kart yok" olur. */
  isSearching: boolean;
}

export function KanbanColumn({
  column,
  cards,
  totalCount,
  draggingCardId,
  dropTarget,
  canDrag,
  acceptsDrop,
  onAddCard,
  onOpenCard,
  onEditCard,
  onDeleteCard,
  onDragStartCard,
  onDragEnd,
  onDragOverTarget,
  onDrop,
  searchValue,
  onSearchChange,
  isSearching,
}: KanbanColumnProps) {
  const others = cards.filter((card) => card.id !== draggingCardId);
  const isTargetColumn = acceptsDrop && dropTarget?.column === column;

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>) {
    if (!acceptsDrop) return;
    event.preventDefault();
    // Kartlarin uzerinde degil, kolonun bos alaninda: sona ekle.
    if (event.target === event.currentTarget) {
      onDragOverTarget({ column, index: others.length });
    }
  }

  function handleCardDragOver(event: DragEvent<HTMLDivElement>, card: KanbanCard) {
    if (!acceptsDrop || card.id === draggingCardId) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const isUpperHalf = event.clientY < rect.top + rect.height / 2;
    const index = others.findIndex((other) => other.id === card.id);
    onDragOverTarget({ column, index: isUpperHalf ? index : index + 1 });
  }

  const indicator = <div className="h-1 rounded-full bg-app-brand" aria-hidden="true" />;

  return (
    <section
      className={clsx(
        'flex min-w-[260px] flex-1 flex-col rounded-xl border border-app-border p-2 shadow-sm',
        COLUMN_SURFACE[column],
      )}
    >
      {/* Sabit yukseklik: "Kart Ekle" butonu olan/olmayan kolon basliklari ayni hizada kalsin. */}
      <header className="mb-2 flex h-10 items-center justify-between gap-2 pr-1 pl-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold leading-none text-white">
          {t.columns[column]}
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white px-1.5 text-xs font-medium text-white">
            {totalCount}
          </span>
        </h2>
        {onAddCard && (
          <button
            type="button"
            onClick={onAddCard}
            aria-label={t.board.addCard}
            title={t.board.addCard}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white text-white hover:bg-white/15"
          >
            <Plus size={16} />
          </button>
        )}
      </header>
      <div className="relative mx-1 mb-2">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-app-muted"
        />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.board.searchPlaceholder}
          aria-label={`${t.columns[column]} - ${t.board.searchPlaceholder}`}
          className="h-8 w-full rounded-md border border-app-border bg-app-surface pr-7 pl-8 text-xs text-app-text outline-none placeholder:text-app-muted focus:border-app-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label={t.board.clearSearch}
            title={t.board.clearSearch}
            className="absolute top-1/2 right-1.5 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-app-muted hover:text-app-text"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div
        onDragOver={handleColumnDragOver}
        onDrop={(event) => {
          if (!acceptsDrop) return;
          event.preventDefault();
          onDrop();
        }}
        className={clsx(
          'flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg p-1 transition-colors',
          isTargetColumn && 'bg-app-surface/60 ring-2 ring-app-brand/40',
        )}
      >
        {cards.length === 0 && !isTargetColumn && (
          <p className="pointer-events-none py-6 text-center text-xs text-app-muted">
            {isSearching ? t.board.noSearchMatch : t.board.emptyColumn}
          </p>
        )}
        {cards.map((card) => {
          const otherIndex = others.findIndex((other) => other.id === card.id);
          const showIndicatorBefore =
            isTargetColumn && otherIndex !== -1 && dropTarget?.index === otherIndex;
          return (
            <div key={card.id} className="flex flex-col gap-2">
              {showIndicatorBefore && indicator}
              <KanbanCardItem
                card={card}
                draggable={canDrag && card.column !== 'DONE'}
                isDragging={card.id === draggingCardId}
                onOpen={() => onOpenCard(card)}
                onEdit={onEditCard ? () => onEditCard(card) : undefined}
                onDelete={onDeleteCard ? () => onDeleteCard(card) : undefined}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', card.id);
                  onDragStartCard(card);
                }}
                onDragEnd={onDragEnd}
                onDragOver={(event) => handleCardDragOver(event, card)}
              />
            </div>
          );
        })}
        {isTargetColumn && dropTarget?.index === others.length && indicator}
      </div>
    </section>
  );
}
