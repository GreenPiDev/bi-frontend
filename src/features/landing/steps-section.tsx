import { LayoutDashboard, SlidersHorizontal, Upload, type LucideIcon } from 'lucide-react';
import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';

const STEP_ICONS: LucideIcon[] = [Upload, SlidersHorizontal, LayoutDashboard];

export function StepsSection() {
  const { steps } = tr.landing;
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <p className="text-sm font-semibold tracking-wide text-app-brand uppercase">
          {steps.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-app-text">{steps.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-app-muted">{steps.subtitle}</p>
      </Reveal>
      <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
        <div
          aria-hidden="true"
          className="absolute top-7 right-[16.5%] left-[16.5%] hidden h-px bg-gradient-to-r from-app-brand/0 via-app-brand/25 to-app-brand/0 sm:block"
        />
        {steps.items.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <Reveal key={step.title} delay={index * 150} className="relative text-center">
              <div className="group mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a7a] to-[#4f7fe0] text-white shadow-lg shadow-blue-500/20 transition-transform duration-300 hover:-translate-y-1 hover:scale-105">
                <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="mt-4 inline-block text-xs font-bold tracking-widest text-app-brand/60">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-app-text">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-app-muted">
                {step.description}
              </p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
