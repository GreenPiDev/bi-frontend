import { describe, expect, it } from 'vitest';
import type { KanbanCard, KanbanColumn } from '../../lib/api';
import {
  applyCardMove,
  cardMatchesSearch,
  isOverdue,
  toFullIndex,
  truncateText,
} from './kanban-board-utils';

function card(id: string, column: KanbanColumn, position: number, assigneeId = 'u1'): KanbanCard {
  return {
    id,
    title: id,
    description: null,
    column,
    position,
    priority: 'MEDIUM',
    dueDate: null,
    assignee: { id: assigneeId, name: 'Ali Veli', avatarUrl: null, isExternal: false },
    completedAt: null,
    revisions: [],
    progressNotes: [],
    createdAt: '2026-11-01T00:00:00.000Z',
  };
}

describe('kanban-board-utils', () => {
  it('applyCardMove inserts the card at the target index and renumbers the column', () => {
    const cards = [card('a', 'IN_PROGRESS', 0), card('b', 'IN_PROGRESS', 1), card('c', 'TODO', 0)];
    const result = applyCardMove(cards, 'c', 'IN_PROGRESS', 1);
    const byId = Object.fromEntries(result.map((item) => [item.id, item]));
    expect(byId.c).toMatchObject({ column: 'IN_PROGRESS', position: 1 });
    expect(byId.a.position).toBe(0);
    expect(byId.b.position).toBe(2);
  });

  it('toFullIndex maps a filtered ("only mine") index to the full column index', () => {
    const all = [
      card('a', 'TODO', 0, 'me'),
      card('b', 'TODO', 1, 'other'),
      card('c', 'TODO', 2, 'me'),
      card('d', 'IN_PROGRESS', 0, 'me'),
    ];
    const visible = all.filter((item) => item.column === 'TODO' && item.assignee?.id === 'me');
    // gorunen listede 'c'nin onune birakmak = tam listede 'c'nin indeksi (2)
    expect(toFullIndex(all, visible, 'TODO', 'd', 1)).toBe(2);
    // gorunen listenin sonuna birakmak = son gorunen kartin hemen arkasi
    expect(toFullIndex(all, visible, 'TODO', 'd', 2)).toBe(3);
  });

  it('isOverdue ignores DONE cards and cards without a due date', () => {
    const today = new Date(2026, 10, 13);
    expect(isOverdue({ ...card('a', 'TODO', 0), dueDate: '2026-11-12' }, today)).toBe(true);
    expect(isOverdue({ ...card('a', 'TODO', 0), dueDate: '2026-11-13' }, today)).toBe(false);
    expect(isOverdue({ ...card('a', 'DONE', 0), dueDate: '2026-11-01' }, today)).toBe(false);
    expect(isOverdue(card('a', 'TODO', 0), today)).toBe(false);
  });

  it('truncateText cuts long text with an ellipsis', () => {
    expect(truncateText('kısa', 10)).toBe('kısa');
    expect(truncateText('çok uzun bir açıklama metni', 8)).toBe('çok uzun…');
  });
});

describe('cardMatchesSearch', () => {
  const base = card('a', 'TODO', 0);
  it('matches title, description and assignee name case-insensitively (Turkish)', () => {
    const target = { ...base, title: 'İRSALİYE kontrolü', description: 'Depo ışıkları' };
    expect(cardMatchesSearch(target, 'irsaliye')).toBe(true);
    expect(cardMatchesSearch(target, 'IŞIK')).toBe(true);
    expect(cardMatchesSearch(target, 'ali')).toBe(true); // atanan: "Ali Veli"
    expect(cardMatchesSearch(target, 'fatura')).toBe(false);
  });
  it('treats an empty query as a match and tolerates unassigned cards', () => {
    expect(cardMatchesSearch({ ...base, assignee: null }, '  ')).toBe(true);
    expect(cardMatchesSearch({ ...base, assignee: null }, 'ali')).toBe(false);
  });
});
