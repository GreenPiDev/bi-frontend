import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';
import { DemoRequestForm } from './demo-request-form';

export function DemoSection() {
  const { demoForm } = tr.landing;
  return (
    <section id="demo" className="relative scroll-mt-24 py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-6 lg:grid-cols-2">
        <Reveal direction="left">
          <p className="text-sm font-semibold tracking-wide text-blue-200 uppercase">
            {demoForm.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-balance text-white sm:text-4xl">
            {demoForm.title}
          </h2>
          <p className="mt-4 max-w-md text-slate-300">{demoForm.subtitle}</p>
        </Reveal>
        <Reveal
          direction="right"
          delay={100}
          className="rounded-3xl bg-white p-8 shadow-[0_30px_80px_-20px_rgba(10,20,60,0.5)]"
        >
          <DemoRequestForm />
        </Reveal>
      </div>
    </section>
  );
}
