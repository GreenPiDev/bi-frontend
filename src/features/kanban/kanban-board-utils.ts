import type { KanbanCard, KanbanColumn } from '../../lib/api';

export const KANBAN_COLUMNS: readonly KanbanColumn[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

/** Kartta gosterilecek aciklama on izlemesinin azami karakter sayisi - kart
 * boyutlarinin esit kalmasi icin (tam metin detay modalinda). */
export const KANBAN_DESCRIPTION_PREVIEW_LIMIT = 180;

export function truncateText(text: string, limit: number): string {
  const trimmed = text.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit).trimEnd()}…` : trimmed;
}

export function cardsInColumn(cards: KanbanCard[], column: KanbanColumn): KanbanCard[] {
  return cards.filter((card) => card.column === column).sort((a, b) => a.position - b.position);
}

/** Backend'deki KanbanCardsService.moveCard ile ayni siralama mantigi - iyimser
 * guncelleme icin istemci tarafinda uygulanir. */
export function applyCardMove(
  cards: KanbanCard[],
  cardId: string,
  column: KanbanColumn,
  index: number,
): KanbanCard[] {
  const moving = cards.find((card) => card.id === cardId);
  if (!moving) return cards;
  const siblings = cardsInColumn(cards, column).filter((card) => card.id !== cardId);
  const clamped = Math.min(index, siblings.length);
  const ordered = [...siblings.slice(0, clamped), moving, ...siblings.slice(clamped)];
  const positions = new Map(ordered.map((card, position) => [card.id, position]));
  return cards.map((card) =>
    positions.has(card.id)
      ? {
          ...card,
          column: card.id === cardId ? column : card.column,
          position: positions.get(card.id) as number,
        }
      : card,
  );
}

/** YYYY-MM-DD bitis tarihi bugunden onceyse (ve kart tamamlanmamissa) gecikmis sayilir. */
export function isOverdue(card: KanbanCard, today = new Date()): boolean {
  if (!card.dueDate || card.column === 'DONE') return false;
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return card.dueDate < todayKey;
}

export function formatDueDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toLocaleUpperCase('tr-TR');
}

/**
 * "Sadece benim kartlarim" filtresi acikken surukle-birak indeksi gorunen kartlara
 * gore hesaplanir; backend ise kolonun TUM kartlarina gore indeks bekler. Gorunen
 * listedeki hedef konumu, tam listedeki karsiligina cevirir.
 */
export function toFullIndex(
  allCards: KanbanCard[],
  visibleCards: KanbanCard[],
  column: KanbanColumn,
  draggedId: string,
  visibleIndex: number,
): number {
  const full = cardsInColumn(allCards, column).filter((card) => card.id !== draggedId);
  const visible = visibleCards.filter((card) => card.id !== draggedId);
  const anchor = visible[visibleIndex];
  if (anchor) return full.findIndex((card) => card.id === anchor.id);
  const last = visible[visible.length - 1];
  return last ? full.findIndex((card) => card.id === last.id) + 1 : full.length;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** ISO zaman damgasini gg.AA.yyyy SS:dd olarak (yerel saatle) bicimlendirir. */
export function formatDateTime(value: string): string {
  return DATE_TIME_FORMAT.format(new Date(value)).replace(',', '');
}

const normalizeForSearch = (value: string) => value.toLocaleLowerCase('tr-TR').trim();

/** Kolon arama kutusu: baslik, aciklama veya atanan kisinin adinda gecen kartlar
 * (Turkce buyuk/kucuk harf duyarsiz - "İ/ı" dahil). Bos sorgu her karti eslestirir. */
export function cardMatchesSearch(card: KanbanCard, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (!needle) return true;
  return [card.title, card.description ?? '', card.assignee?.name ?? ''].some((field) =>
    normalizeForSearch(field).includes(needle),
  );
}
