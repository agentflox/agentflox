"use client";
import {
    Navigation,
    HeroSection,
    SocialProofSection,
    PlatformFeaturesSection,
    BenefitSection,
    CoreFeatureSection,
    AIAgentSection,
    ProjectManagementSection,
    TestimonialsSection,
    MarketplaceBridge,
    MarketplaceBrowser,
    CTASection,
    Footer,
    QuoteSection
} from "./_components";

export default function LandingPage() {
    return (
        <div className="relative min-h-screen bg-[#030303] text-white overflow-x-hidden">
            <Navigation />
            <HeroSection />
            <SocialProofSection />
            <PlatformFeaturesSection />
            <ProjectManagementSection />
            <AIAgentSection />
            <QuoteSection />
            <MarketplaceBridge />
            <MarketplaceBrowser />
            <TestimonialsSection />
            <CTASection />
            <Footer />
        </div>
    );
}
