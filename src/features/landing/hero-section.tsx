import { tr } from '../../i18n/tr';
import { DashboardPreview } from './dashboard-preview';

const WORD_STAGGER_MS = 70;

export function HeroSection() {
  const { hero } = tr.landing;
  const words = hero.title.split(' ');

  return (
    <section className="relative flex min-h-screen items-center">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 pt-32 pb-28 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1
            aria-label={hero.title}
            className="landing-display text-[2.6rem] leading-[1.04] font-semibold text-balance sm:text-6xl lg:text-[4.1rem]"
          >
            {words.map((word, index) => (
              <span key={`${word}-${index}`} aria-hidden="true">
                <span className="landing-word">
                  <span
                    className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent"
                    style={{ '--d': `${index * WORD_STAGGER_MS + 150}ms` } as React.CSSProperties}
                  >
                    {word}
                  </span>
                </span>{' '}
              </span>
            ))}
          </h1>
          <p
            className="landing-rise mt-8 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
            style={{ '--d': '900ms' } as React.CSSProperties}
          >
            {hero.subtitle}
          </p>
        </div>

        <div className="landing-rise relative" style={{ '--d': '600ms' } as React.CSSProperties}>
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(90,120,255,0.25),transparent_65%)] blur-2xl" />
          <DashboardPreview />
        </div>
      </div>

      <a
        href="#features"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute bottom-8 left-1/2 hidden h-14 w-px -translate-x-1/2 overflow-hidden bg-white/10 sm:block"
      >
        <span className="landing-scroll-line block h-full w-full bg-white/70" />
      </a>
    </section>
  );
}
