import { clsx } from 'clsx';
import { useScrolledPast } from '../../lib/use-scrolled-past';
import { tr } from '../../i18n/tr';
import { CtaLink } from './cta-button';

export function SiteHeader() {
  const { nav } = tr.landing;
  const scrolled = useScrolledPast(40);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex justify-center px-4 pt-4">
      <div
        className={clsx(
          'flex w-full max-w-5xl items-center justify-between rounded-full border py-2 pr-2 pl-5 transition-all duration-500',
          scrolled
            ? 'border-white/10 bg-[#080b16]/70 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl'
            : 'border-transparent bg-transparent',
        )}
      >
        <div className="flex items-center gap-2.5">
          <img src="/minik-logo.png" alt="" className="h-7 w-auto" />
          <span className="landing-display text-lg font-semibold text-white">
            {tr.common.appName}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#features"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white sm:block"
          >
            {nav.features}
          </a>
          <a
            href="#how"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-white sm:block"
          >
            {nav.howItWorks}
          </a>
          <CtaLink href="#demo" className="landing-bob">
            {nav.demoCta}
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
