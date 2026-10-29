import { clsx } from 'clsx';
import { Button } from '../../components/ui/button';
import { useScrolledPast } from '../../lib/use-scrolled-past';
import { tr } from '../../i18n/tr';

export function SiteHeader() {
  const { nav } = tr.landing;
  const scrolled = useScrolledPast(40);

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 left-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-white/10 bg-[#0b1631]/85 py-3 shadow-lg shadow-black/20 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent py-5',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <img src="/minik-logo.png" alt="" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight text-white">{tr.common.appName}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#features"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
          >
            {nav.features}
          </a>
          <a
            href="#how"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:block"
          >
            {nav.howItWorks}
          </a>
          <a href="#demo" className="landing-bob inline-block">
            <Button className="shadow-lg shadow-blue-500/20">{nav.demoCta}</Button>
          </a>
        </div>
      </div>
    </header>
  );
}
