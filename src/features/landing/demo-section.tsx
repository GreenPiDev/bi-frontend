import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';
import { DemoRequestForm } from './demo-request-form';

export function DemoSection() {
  const { demoForm } = tr.landing;
  return (
    <section id="demo" className="relative scroll-mt-24 py-28 sm:py-36">
      <Reveal className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-blue-300 uppercase">
            {demoForm.eyebrow}
          </p>
          <h2 className="landing-display mt-5 text-4xl leading-[1.08] font-semibold text-balance text-white sm:text-5xl">
            {demoForm.title}
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">
            {demoForm.subtitle}
          </p>
        </div>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur sm:p-8">
          <DemoRequestForm />
        </div>
      </Reveal>
    </section>
  );
}
