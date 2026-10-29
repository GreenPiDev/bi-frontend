import { useEffect } from 'react';
import { AmbientEffects } from '../features/landing/ambient-effects';
import { DemoSection } from '../features/landing/demo-section';
import { FeaturesSection } from '../features/landing/features-section';
import { HeroSection } from '../features/landing/hero-section';
import { SiteFooter } from '../features/landing/site-footer';
import { SiteHeader } from '../features/landing/site-header';
import { StepsSection } from '../features/landing/steps-section';

export function LandingPage() {
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
    <div className="landing-root relative min-h-screen overflow-x-clip text-slate-300 antialiased selection:bg-indigo-400/30 selection:text-white">
      <AmbientEffects />
      {/* Sabit, cok yumusak aurora zemini: sayfa kayarken yerinde durur, derinlik hissi verir. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-1/3 left-1/2 h-[80vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(60,90,220,0.20),transparent_65%)]" />
        <div className="absolute right-[-20%] bottom-[-30%] h-[70vh] w-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(120,70,220,0.12),transparent_65%)]" />
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
      <div className="relative z-10">
        <SiteHeader />
        <HeroSection />
        <FeaturesSection />
        <StepsSection />
        <DemoSection />
        <SiteFooter />
      </div>
    </div>
  );
}
