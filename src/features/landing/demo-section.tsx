import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';
import { DemoRequestForm } from './demo-request-form';

export function DemoSection() {
  const { demoForm } = tr.landing;
  return (
    <section id="demo" className="bg-gradient-to-b from-app-surface to-app-bg-muted py-24">
      <div className="mx-auto grid max-w-5xl items-start gap-12 px-6 lg:grid-cols-2">
        <Reveal direction="left" className="lg:pt-6">
          <h2 className="text-3xl font-bold text-app-text">{demoForm.title}</h2>
          <p className="mt-3 text-app-muted">{demoForm.subtitle}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {demoForm.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3 text-sm font-medium text-app-text"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal
          direction="right"
          delay={100}
          className="rounded-3xl border border-app-border bg-app-surface p-8 shadow-xl shadow-slate-200/50 transition-shadow duration-300 hover:shadow-2xl hover:shadow-slate-300/60"
        >
          <DemoRequestForm />
        </Reveal>
      </div>
    </section>
  );
}
