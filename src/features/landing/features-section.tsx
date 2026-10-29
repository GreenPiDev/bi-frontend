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
    <section id="features" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-white">{features.title}</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.items.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <Reveal key={feature.title} delay={(index % 3) * 100}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-black/30">
                  <Icon
                    size={96}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute -right-5 -bottom-2 rotate-[14deg] text-white opacity-10 transition-opacity duration-300 group-hover:opacity-15"
                  />
                  <h3 className="relative text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-slate-300">
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
