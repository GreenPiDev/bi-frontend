import { ChevronDown } from 'lucide-react';
import { tr } from '../../i18n/tr';
import { DashboardPreview } from './dashboard-preview';

export function HeroSection() {
  const { hero } = tr.landing;
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div className="landing-blob pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="landing-blob-delayed pointer-events-none absolute top-20 -right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-28 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-[1.1] text-balance text-white sm:text-5xl lg:text-[3.25rem]">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">{hero.subtitle}</p>
          <p className="mt-6 text-sm text-slate-400">{hero.trust}</p>
        </div>

        <div className="relative">
          <div className="landing-float -rotate-2 transition-transform duration-500 hover:rotate-0">
            <DashboardPreview />
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
