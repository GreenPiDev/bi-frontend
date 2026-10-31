import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { tr } from '../../i18n/tr';
import { CtaButton } from './cta-button';
import { DashboardPreview } from './dashboard-preview';
import { DemoAccountDialog } from './demo-account-dialog';

const WORD_STAGGER_MS = 70;

export function HeroSection() {
  const { hero, demoAccount } = tr.landing;
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const words = hero.title.split(' ');

  return (
    <section className="relative flex min-h-screen items-center">
      <div className="mx-auto grid w-full max-w-[96rem] items-center gap-16 px-6 lg:px-12 pt-32 pb-28 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1
            aria-label={hero.title}
            className="landing-display text-[2.6rem] leading-[1.04] font-semibold text-balance sm:text-6xl lg:text-[4.1rem]"
          >
            {words.map((word, index) => (
              <span key={`${word}-${index}`} aria-hidden="true">
                <span className="landing-word">
                  <span
                    className="bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-transparent"
                    style={{ '--d': `${index * WORD_STAGGER_MS + 150}ms` } as React.CSSProperties}
                  >
                    {word}
                  </span>
                </span>{' '}
              </span>
            ))}
          </h1>
          <p
            className="landing-rise mt-8 text-base leading-relaxed text-zinc-400 sm:text-lg"
            style={{ '--d': '900ms' } as React.CSSProperties}
          >
            {hero.subtitle}
          </p>
          <div
            className="landing-rise mt-10 flex flex-col items-start gap-3"
            style={{ '--d': '1050ms' } as React.CSSProperties}
          >
            <CtaButton
              type="button"
              onClick={() => setDemoDialogOpen(true)}
              className="group gap-2 px-7 py-3.5 text-base"
            >
              {demoAccount.cta}
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </CtaButton>
            <span className="text-xs text-zinc-500">{demoAccount.ctaHint}</span>
          </div>
        </div>

        <div className="landing-rise relative" style={{ '--d': '600ms' } as React.CSSProperties}>
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_65%)] blur-2xl" />
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

      {demoDialogOpen && <DemoAccountDialog onClose={() => setDemoDialogOpen(false)} />}
    </section>
  );
}
