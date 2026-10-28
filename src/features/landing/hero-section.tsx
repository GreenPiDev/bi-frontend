import { ChevronDown, FileCheck2, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { tr } from '../../i18n/tr';
import { DashboardPreview } from './dashboard-preview';

export function HeroSection() {
  const { hero, preview } = tr.landing;
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0b1631] via-[#102250] to-[#0c1838]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="landing-blob pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="landing-blob-delayed pointer-events-none absolute top-20 -right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-app-bg-muted to-transparent" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-36 pb-24 lg:grid-cols-2 lg:pt-40 lg:pb-32">
        <div>
          <span className="landing-gradient-text inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            {hero.eyebrow}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] text-balance text-white sm:text-5xl lg:text-[3.25rem]">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#demo">
              <Button className="group px-6 py-3 text-base shadow-xl shadow-blue-500/25 transition-transform duration-200 hover:scale-[1.03]">
                {hero.primaryCta}
              </Button>
            </a>
            <Link to="/login">
              <Button
                variant="secondary"
                className="border-white/25 px-6 py-3 text-base text-white transition-transform duration-200 hover:scale-[1.03] hover:bg-white/10"
              >
                {hero.secondaryCta}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">{hero.trust}</p>
        </div>

        <div className="relative">
          <div className="landing-float -rotate-2 transition-transform duration-500 hover:rotate-0">
            <DashboardPreview />
          </div>
          <div className="landing-float absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-black/5 sm:flex [animation-delay:-2s]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Package className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-700">{preview.pillStock}</span>
          </div>
          <div className="landing-float absolute -top-5 -right-3 hidden items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-black/5 sm:flex [animation-delay:-4s]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <FileCheck2 className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-slate-700">{preview.pillQuote}</span>
          </div>
        </div>
      </div>

      <a
        href="#how"
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce text-slate-500 hover:text-slate-300 sm:block"
      >
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  );
}
