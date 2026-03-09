"use client";
import {
    Navigation,
    HeroSection,
    PlatformFeaturesSection,
    BenefitSection,
    CoreFeatureSection,
    AIAgentSection,
    ProjectManagementSection,
    WhyChooseUsSection,
    TestimonialsSection,
    MarketplaceBrowser,
    CTASection,
    Footer
} from "./_components";
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

export default function LandingPage() {
    return (
        <div className="relative min-h-screen text-white overflow-x-hidden">
            <AnimatedBackground />
            <Navigation />
            <HeroSection />
            <PlatformFeaturesSection />
            <BenefitSection />
            <CoreFeatureSection />
            <AIAgentSection />
            <ProjectManagementSection />
            <MarketplaceBrowser />
            <WhyChooseUsSection />
            <TestimonialsSection />
            <CTASection />
            <Footer />
        </div>
    );
};
