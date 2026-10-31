import {
  BarChart3,
  Briefcase,
  CalendarDays,
  FileText,
  Home,
  Mail,
  MessageCircle,
  Package,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';
import { tr } from '../../i18n/tr';
import { useLookAtCursor } from './use-look-at-cursor';

const MAX_TILT_DEG = 14;
const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const DONUT_GAP = 1.5;

const RAIL_ICONS: LucideIcon[] = [
  Home,
  Users,
  MessageCircle,
  CalendarDays,
  Mail,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
];
const KPI_ICONS: LucideIcon[] = [FileText, MessageCircle, Target, Briefcase, Mail, Package];
const STATUS_COLORS = ['#4f7fe0', '#3fae5a', '#e87ba4', '#eda100'];
const NOTE_TINTS = ['border-amber-400/30 bg-amber-50', 'border-sky-400/30 bg-sky-50'];

function DonutChart() {
  const { statuses } = tr.landing.preview;
  const total = statuses.reduce((sum, status) => sum + status.count, 0);
  const lengths = statuses.map((status) => (status.count / total) * DONUT_CIRCUMFERENCE);

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
      {statuses.map((status, index) => {
        const visible = Math.max(lengths[index] - DONUT_GAP, 0.5);
        const offset = -lengths.slice(0, index).reduce((sum, length) => sum + length, 0);
        return (
          <circle
            key={status.label}
            cx="50"
            cy="50"
            r={DONUT_RADIUS}
            fill="none"
            stroke={STATUS_COLORS[index]}
            strokeWidth="13"
            className="landing-donut-seg"
            style={{
              strokeDasharray: `${visible} ${DONUT_CIRCUMFERENCE - visible}`,
              strokeDashoffset: offset,
            }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Tanitim sayfasinin hero bolumunde gosterilen, salt gorsel bir urun onizlemesi - gercek
 * "Ana Sayfa" ekraninin (home-page.tsx) kirik beyaz zemine uyarlanmis, ornek veriyle doldurulmus
 * bir kopyasi; gercek veri tasimaz. Imlec sayfanin neresindeyse 3B olarak ona doner
 * (bkz. use-look-at-cursor.ts; dokunmatik/hareket-azalt tercihinde sabit kalir).
 */
export function DashboardPreview() {
  const { preview } = tr.landing;
  const tiltRef = useRef<HTMLDivElement | null>(null);
  useLookAtCursor(tiltRef, MAX_TILT_DEG);

  return (
    <div className="landing-float">
      <div
        ref={tiltRef}
        className="relative flex overflow-hidden rounded-3xl border border-white/20 bg-[#f7f5f0] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.9)] will-change-transform"
      >
        <div className="hidden w-11 shrink-0 flex-col items-center gap-3.5 border-r border-zinc-900/[0.06] bg-[#efece5] py-5 sm:flex">
          {RAIL_ICONS.map((Icon, index) => (
            <span
              key={index}
              className={
                index === 0
                  ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b2e33] text-white'
                  : 'flex h-7 w-7 items-center justify-center text-zinc-400'
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2.5">
            {preview.kpis.map((kpi, index) => {
              const Icon = KPI_ICONS[index];
              return (
                <div
                  key={kpi.label}
                  className="relative overflow-hidden rounded-xl border border-zinc-900/[0.06] bg-white p-3 transition-colors duration-300 hover:bg-zinc-50"
                  style={{
                    animation: `landing-fade-in 0.6s ease-out backwards`,
                    animationDelay: `${900 + index * 100}ms`,
                  }}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.2}
                    className="pointer-events-none absolute -right-2 -bottom-2 h-12 w-12 -rotate-12 text-blue-600 opacity-[0.08]"
                  />
                  <p className="landing-display text-xl font-semibold text-zinc-900">{kpi.value}</p>
                  <p className="mt-0.5 text-[10px] leading-tight font-medium text-zinc-500">
                    {kpi.label}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-zinc-900/[0.06] bg-white p-3.5">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              {preview.chartTitle}
            </p>
            <div className="mt-3 flex items-center gap-5">
              <div className="h-24 w-24 shrink-0">
                <DonutChart />
              </div>
              <ul className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1.5">
                {preview.statuses.map((status, index) => (
                  <li key={status.label} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: STATUS_COLORS[index] }}
                    />
                    <span className="truncate text-zinc-500">
                      {status.label}:{' '}
                      <span className="font-medium text-zinc-800">{status.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              {preview.notesTitle}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {preview.notes.map((note, index) => (
                <div
                  key={note.text}
                  className={`rounded-xl border p-2.5 ${NOTE_TINTS[index % NOTE_TINTS.length]}`}
                >
                  <p className="text-[9px] font-medium text-zinc-500">{note.date}</p>
                  <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-zinc-700">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
