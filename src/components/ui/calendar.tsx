import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface CalendarProps {
  /** 'YYYY-MM-DD' formatinda secili tarih, yoksa bos string. */
  value: string;
  onSelect: (isoDate: string) => void;
}

const YEAR_RANGE_PAST = 80;
const YEAR_RANGE_FUTURE = 10;

function parseIso(iso: string): Date | null {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Ay/yil dropdown'lu, gun izgarali ozel takvim - tarayicinin yerel tarih secicisinin
 * tarayicidan tarayiciya tutarsiz gorunumu yerine kullanilir. */
export function Calendar({ value, onSelect }: CalendarProps) {
  const selected = parseIso(value);
  const today = new Date();
  const initial = selected ?? today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long' });
  const weekdayFormatter = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });

  const months = Array.from({ length: 12 }, (_, m) => monthFormatter.format(new Date(2000, m, 1)));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormatter.format(new Date(2000, 0, 3 + i)),
  );

  const currentYear = today.getFullYear();
  const years: number[] = [];
  for (let y = currentYear - YEAR_RANGE_PAST; y <= currentYear + YEAR_RANGE_FUTURE; y++) {
    years.push(y);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; month: number; year: number; outside: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const month = viewMonth === 0 ? 11 : viewMonth - 1;
    const year = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: daysInPrevMonth - i, month, year, outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, month: viewMonth, year: viewYear, outside: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1];
    const nextDay = last.day + 1;
    const overflowsMonth = new Date(last.year, last.month + 1, 0).getDate();
    if (nextDay > overflowsMonth) {
      const month = last.month === 11 ? 0 : last.month + 1;
      const year = last.month === 11 ? last.year + 1 : last.year;
      cells.push({ day: 1, month, year, outside: true });
    } else {
      cells.push({ day: nextDay, month: last.month, year: last.year, outside: true });
    }
  }

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(cell: { day: number; month: number; year: number }) {
    onSelect(toIso(cell.year, cell.month, cell.day));
  }

  return (
    <div
      className="w-72 rounded-lg border border-app-border bg-app-surface p-3 shadow-lg"
      role="dialog"
    >
      <div className="mb-2.5 flex items-center gap-1">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="Önceki ay"
          className="flex-none rounded-md p-1 text-app-text hover:bg-app-bg"
        >
          <ChevronLeft size={18} />
        </button>
        <select
          value={viewMonth}
          onChange={(event) => setViewMonth(Number(event.target.value))}
          aria-label="Ay"
          className="min-w-0 flex-1 rounded-md border border-app-border bg-app-surface px-1.5 py-1 text-xs text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          {months.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={viewYear}
          onChange={(event) => setViewYear(Number(event.target.value))}
          aria-label="Yıl"
          className="min-w-0 flex-1 rounded-md border border-app-border bg-app-surface px-1.5 py-1 text-xs text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Sonraki ay"
          className="flex-none rounded-md p-1 text-app-text hover:bg-app-bg"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {weekdays.map((name) => (
          <span
            key={name}
            className="text-center text-[0.7rem] font-semibold capitalize text-app-muted"
          >
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const cellDate = new Date(cell.year, cell.month, cell.day);
          const isSelected = selected ? isSameDay(cellDate, selected) : false;
          const isToday = isSameDay(cellDate, today);
          return (
            <button
              type="button"
              key={`${cell.year}-${cell.month}-${cell.day}`}
              onClick={() => handleSelectDay(cell)}
              className={clsx(
                'rounded-md py-1.5 text-center text-sm text-app-text hover:bg-app-bg',
                cell.outside && 'text-app-muted opacity-55',
                isToday && !isSelected && 'border border-app-primary',
                isSelected && 'bg-app-primary text-white hover:bg-app-primary',
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center border-t border-app-border pt-2">
        <button
          type="button"
          onClick={() =>
            handleSelectDay({
              day: today.getDate(),
              month: today.getMonth(),
              year: today.getFullYear(),
            })
          }
          className="text-xs font-semibold text-app-primary hover:underline"
        >
          Bugün
        </button>
      </div>
    </div>
  );
}
