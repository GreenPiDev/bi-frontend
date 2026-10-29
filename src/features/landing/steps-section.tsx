import { Reveal } from '../../components/ui/reveal';
import { useScrollReveal } from '../../lib/use-scroll-reveal';
import { tr } from '../../i18n/tr';

export function StepsSection() {
  const { steps } = tr.landing;
  const { ref: lineRef, isVisible: lineVisible } = useScrollReveal<HTMLDivElement>(0.4);

  return (
    <section id="how" className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-28 sm:py-36">
      <Reveal>
        <h2 className="landing-display max-w-3xl text-4xl leading-[1.08] font-semibold text-balance text-white sm:text-5xl">
          {steps.title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-slate-400">{steps.subtitle}</p>
      </Reveal>

      <div ref={lineRef} className="relative mt-20 grid gap-14 md:grid-cols-3 md:gap-10">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 left-0 hidden h-px origin-left bg-gradient-to-r from-blue-400/60 via-indigo-400/40 to-transparent transition-transform duration-[1600ms] ease-out md:block"
          style={{ transform: lineVisible ? 'scaleX(1)' : 'scaleX(0)' }}
        />
        {steps.items.map((step, index) => (
          <Reveal key={step.title} delay={index * 150} className="group relative md:pt-10">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="landing-display shrink-0 text-[7rem] leading-[0.9] font-semibold text-transparent select-none [-webkit-text-stroke:1px_rgba(255,255,255,0.14)] transition-all duration-500 group-hover:[-webkit-text-stroke:1px_rgba(140,170,255,0.5)]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="landing-display text-[1.7rem] leading-[1.08] font-semibold text-white">
                {step.title}
              </h3>
            </div>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-slate-400">
              {step.description}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
