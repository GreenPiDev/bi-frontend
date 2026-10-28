import { TrendingUp } from 'lucide-react';
import { tr } from '../../i18n/tr';

const BAR_HEIGHTS = [46, 63, 54, 79, 71, 94];

/**
 * Tanitim sayfasinin hero bolumunde gosterilen, salt gorsel bir urun onizlemesi -
 * gercek veri tasimaz, PiLens'in "nasil bir sey" oldugunu ilk bakista anlatmak icindir.
 */
export function DashboardPreview() {
  const { preview } = tr.landing;
  return (
    <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-[0_30px_80px_-20px_rgba(10,20,60,0.45)] ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-sm font-semibold text-slate-800">{preview.title}</span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {preview.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {preview.kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className="rounded-xl bg-slate-50 p-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            style={{
              animation: `landing-fade-in 0.6s ease-out backwards`,
              animationDelay: `${index * 120}ms`,
            }}
          >
            <p className="truncate text-[11px] font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{kpi.value}</p>
            <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500">{preview.chartTitle}</p>
        <div className="mt-4 flex h-32 items-end justify-between gap-2.5">
          {BAR_HEIGHTS.map((height, index) => (
            <div
              key={preview.chartMonths[index]}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div
                className="landing-bar-grow w-full rounded-t-md bg-gradient-to-t from-[#1e3a7a] to-[#4f7fe0]"
                style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }}
              />
              <span className="text-[10px] font-medium text-slate-400">
                {preview.chartMonths[index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
