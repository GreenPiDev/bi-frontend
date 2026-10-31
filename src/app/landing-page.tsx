import { useEffect, useRef, useState } from 'react';
import { DotWave, type DotWaveShape } from '../features/landing/dot-wave';
import { AmbientEffects } from '../features/landing/ambient-effects';
import { DemoSection } from '../features/landing/demo-section';
import { FeaturesSection } from '../features/landing/features-section';
import { HeroSection } from '../features/landing/hero-section';
import { SiteFooter } from '../features/landing/site-footer';
import { SiteHeader } from '../features/landing/site-header';
import { StepsSection } from '../features/landing/steps-section';

export function LandingPage() {
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [dotShape, setDotShape] = useState<DotWaveShape>('terrain');

  // Hero'da noktalar alttaki dalga; ozellikler bolumunde saga kayip pi seklini alir;
  // sayfanin en altinda (footer) sola gecip donen kureye donusur.
  useEffect(() => {
    const features = featuresRef.current;
    const footer = footerRef.current;
    const steps = stepsRef.current;
    if (!features || !footer || !steps) return;
    // Hero: dalga, ozellikler: pi, adimlar: dalga, demo/footer: kure.
    const visible = { featuresReached: false, steps: false, footer: false };
    const update = () =>
      setDotShape(
        visible.footer
          ? 'globe'
          : visible.steps
            ? 'terrain'
            : visible.featuresReached
              ? 'sphere'
              : 'terrain',
      );
    const featuresObserver = new IntersectionObserver(
      ([entry]) => {
        visible.featuresReached = entry.isIntersecting || entry.boundingClientRect.top < 0;
        update();
      },
      { threshold: 0.3 },
    );
    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        visible.footer = entry.isIntersecting;
        update();
      },
      // Demo bolumunun ustu ekranin alt %40'ina girer girmez (adimlardan demoya gecerken) kureye donusum baslar.
      { threshold: 0, rootMargin: '0px 0px -40% 0px' },
    );
    // Adimlar bolumunde noktalar tekrar varsayilan dalga olur.
    const stepsObserver = new IntersectionObserver(
      ([entry]) => {
        visible.steps = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 },
    );
    stepsObserver.observe(steps);
    featuresObserver.observe(features);
    footerObserver.observe(footer);
    return () => {
      featuresObserver.disconnect();
      stepsObserver.disconnect();
      footerObserver.disconnect();
    };
  }, []);

  // Header'daki "#demo"/"#features"/"#how" linklerinin aninda ziplamak yerine
  // yumusak kaydirmasi icin - sadece bu sayfa acikken aktif, diger ekranlari etkilemez.
  useEffect(() => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return (
    <div className="landing-root relative min-h-screen overflow-x-clip text-zinc-300 antialiased selection:bg-zinc-400/30 selection:text-white">
      <AmbientEffects />
      {/* Sabit, cok yumusak aurora zemini: sayfa kayarken yerinde durur, derinlik hissi verir. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-1/3 left-1/2 h-[80vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,0.07),transparent_65%)]" />
        <div className="absolute right-[-20%] bottom-[-30%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,0.04),transparent_65%)]" />
        <div
          className="absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_50%_20%,#000,transparent_70%)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="landing-grain absolute inset-0 opacity-[0.08]" />
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <DotWave shape={dotShape} color="#e4e4e7" opacity={0.08} />
      </div>
      <div className="relative z-10">
        <SiteHeader />
        <HeroSection />
        <div ref={featuresRef}>
          <FeaturesSection />
        </div>
        <div ref={stepsRef}>
          <StepsSection />
        </div>
        <div ref={footerRef}>
          <DemoSection />
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
