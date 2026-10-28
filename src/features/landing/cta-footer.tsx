import { Reveal } from '../../components/ui/reveal';
import { Button } from '../../components/ui/button';
import { tr } from '../../i18n/tr';

function CtaBand() {
  const { ctaBand } = tr.landing;
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1631] to-[#16306e] py-20">
      <div className="landing-blob pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="landing-blob-delayed pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
      <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold text-balance text-white sm:text-4xl">{ctaBand.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">{ctaBand.subtitle}</p>
        <a href="#demo" className="mt-8 inline-block">
          <Button className="px-7 py-3 text-base shadow-xl shadow-blue-500/25 transition-transform duration-200 hover:scale-[1.03]">
            {ctaBand.button}
          </Button>
        </a>
      </Reveal>
    </section>
  );
}

function SiteFooter() {
  const { footer } = tr.landing;
  return (
    <footer className="bg-[#0b1631] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <img src="/minik-logo.png" alt="" className="h-7 w-auto" />
            <span className="text-lg font-bold tracking-tight text-white">{tr.common.appName}</span>
          </div>
          <p className="max-w-xs text-xs text-slate-400">{footer.tagline}</p>
        </div>
        <p className="text-xs text-slate-500">{footer.rights(new Date().getFullYear())}</p>
      </div>
    </footer>
  );
}

export function CtaAndFooter() {
  return (
    <>
      <CtaBand />
      <SiteFooter />
    </>
  );
}
