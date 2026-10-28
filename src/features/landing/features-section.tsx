import {
  BarChart3,
  CalendarClock,
  LineChart,
  Package,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';

const FEATURE_ICONS: LucideIcon[] = [BarChart3, Users, Workflow, Package, CalendarClock, LineChart];

export function FeaturesSection() {
  const { features } = tr.landing;
  return (
    <section id="features" className="bg-app-bg-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-sm font-semibold tracking-wide text-app-brand uppercase">
            {features.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold text-app-text">{features.title}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <Reveal key={feature.title} delay={(index % 3) * 100}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-app-border bg-app-surface p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-2xl hover:shadow-slate-300/50">
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-app-brand/0 via-app-brand/0 to-app-brand/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-app-brand/[0.04] group-hover:to-transparent" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-app-brand/10 text-app-brand transition-all duration-300 group-hover:scale-110 group-hover:bg-app-brand group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="relative mt-5 text-lg font-semibold text-app-text">
                    {feature.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-app-muted">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
