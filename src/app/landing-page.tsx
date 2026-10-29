import { useEffect } from 'react';
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0b1631] via-[#102250] to-[#0c1838]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="relative">
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
