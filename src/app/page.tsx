import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoCloud } from "@/components/landing/logo-cloud";
import { StatsSection } from "@/components/landing/stats-section";
import { ProblemSection } from "@/components/landing/problem";
import { WalkthroughSection } from "@/components/landing/walkthrough";
import {
  TransferFlowSection,
  CampaignFlowSection,
} from "@/components/landing/flow-walkthroughs";
import { BackdoorWalkthroughSection } from "@/components/landing/backdoor-walkthrough";
import { IphoneZkDemoSection } from "@/components/landing/iphone-zk-demo";
import { FeaturesSection } from "@/components/landing/features";
import { UseCasesSection } from "@/components/landing/use-cases";
import { PrivacySection } from "@/components/landing/privacy";
import { RoadmapSection } from "@/components/landing/roadmap-section";
import { FaqSection } from "@/components/landing/faq";
import { CtaBand } from "@/components/landing/cta-band";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base">
      <LandingNavbar />
      <main>
        <Hero />
        <LogoCloud />
        <StatsSection />
        <ProblemSection />
        <WalkthroughSection />
        <TransferFlowSection />
        <CampaignFlowSection />
        <BackdoorWalkthroughSection />
        <IphoneZkDemoSection />
        <FeaturesSection />
        <UseCasesSection />
        <PrivacySection />
        <RoadmapSection />
        <FaqSection />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
