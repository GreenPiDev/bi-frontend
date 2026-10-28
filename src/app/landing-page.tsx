import { CtaAndFooter } from '../features/landing/cta-footer';
import { DemoSection } from '../features/landing/demo-section';
import { FeaturesSection } from '../features/landing/features-section';
import { HeroSection } from '../features/landing/hero-section';
import { SiteHeader } from '../features/landing/site-header';
import { StepsSection } from '../features/landing/steps-section';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app-surface">
      <SiteHeader />
      <HeroSection />
      <StepsSection />
      <FeaturesSection />
      <DemoSection />
      <CtaAndFooter />
    </div>
  );
}
