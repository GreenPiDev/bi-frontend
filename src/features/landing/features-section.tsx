import { clsx } from 'clsx';
import {
  BarChart3,
  Briefcase,
  HeartHandshake,
  MessageSquare,
  Package,
  ShieldCheck,
  Tag,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Reveal } from '../../components/ui/reveal';
import { tr } from '../../i18n/tr';
import { SpotlightCard } from './spotlight-card';

const FEATURE_ICONS: LucideIcon[] = [
  Users,
  Workflow,
  Briefcase,
  Tag,
  Package,
  MessageSquare,
  HeartHandshake,
  ShieldCheck,
  BarChart3,
];

/** Bento yerlesimi (lg: 6 kolon). `wide` kartlar daha buyuk tipografi ve filigran ikon alir.
 * Satirlar: 4+2 / 2+2+2 / 3+3 / 2+4 - her satir tam dolar. */
const BENTO_LAYOUT: { span: string; wide: boolean }[] = [
  { span: 'sm:col-span-2 lg:col-span-4', wide: true },
  { span: 'lg:col-span-2', wide: false },
  { span: 'lg:col-span-2', wide: false },
  { span: 'lg:col-span-2', wide: false },
  { span: 'sm:col-span-2 lg:col-span-2', wide: false },
  { span: 'lg:col-span-3', wide: true },
  { span: 'lg:col-span-3', wide: true },
  { span: 'lg:col-span-2', wide: false },
  { span: 'sm:col-span-2 lg:col-span-4', wide: true },
];

export function FeaturesSection() {
  const { features } = tr.landing;
  return (
    <section id="features" className="relative scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="landing-display max-w-3xl text-4xl leading-[1.08] font-semibold text-balance text-white sm:text-5xl">
            {features.title}
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {features.items.map((feature, index) => {
            const Icon = FEATURE_ICONS[index];
            const { span, wide } = BENTO_LAYOUT[index];
            return (
              <Reveal key={feature.title} delay={(index % 3) * 100} className={span}>
                <SpotlightCard
                  className={clsx(
                    'group flex h-full flex-col justify-start transition-colors duration-500 hover:bg-white/[0.045]',
                    wide ? 'min-h-[260px] p-8 sm:p-9' : 'min-h-[220px] p-7',
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.2}
                    className={clsx(
                      'pointer-events-none absolute -right-5 -bottom-6 -rotate-12 text-blue-300 opacity-[0.07] drop-shadow-[0_8px_24px_rgba(96,140,255,0.45)] transition-all duration-700 group-hover:-rotate-6 group-hover:scale-105 group-hover:opacity-[0.13]',
                      wide ? 'h-56 w-56' : 'h-36 w-36',
                    )}
                  />
                  <div className="relative">
                    <h3
                      className={clsx(
                        'landing-display font-semibold text-white',
                        wide ? 'text-2xl sm:text-[1.7rem]' : 'text-xl',
                      )}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={clsx(
                        'mt-3 leading-relaxed text-slate-400',
                        wide ? 'max-w-md text-[0.95rem]' : 'text-sm',
                      )}
                    >
                      {feature.description}
                    </p>
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
