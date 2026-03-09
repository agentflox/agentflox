"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Handshake, Rocket, Globe, Zap, Users, BarChart } from "lucide-react";

export default function PartnersPage() {
    return (
        <FeaturePageLayout
            badge="Partner Program"
            title="Build Your Business on Agentflox"
            description="Whether you're a system integrator, agency, or technology provider, partnering with Agentflox unlocks new revenue streams."
            heroVisual={
                <div className="w-full h-full p-8 grid grid-cols-2 gap-4 content-center">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-white mb-1">Solution</div>
                        <div className="text-sm text-gray-400">Partners</div>
                        <div className="mt-4 text-xs text-indigo-400">For Agencies & SIs</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-white mb-1">Tech</div>
                        <div className="text-sm text-gray-400">Alliance</div>
                        <div className="mt-4 text-xs text-green-400">For ISVs & SaaS</div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Consulting Partners",
                    description: "Implement Agentflox for enterprise clients. Access training, sales enablement, and deal registration.",
                    icon: Users
                },
                {
                    title: "Technology Partners",
                    description: "Integrate your software with our agent ecosystem. Get listed in our marketplace.",
                    icon: Zap
                },
                {
                    title: "Co-Marketing",
                    description: "Run joint webinars, publish case studies, and sponsor events with us.",
                    icon: Globe
                }
            ]}
            stats={[
                { label: "Partners", value: "500+", subtext: "Global network" },
                { label: "Deal Reg", value: "20%", subtext: "Margin protection" },
                { label: "Growth", value: "3x", subtext: "YoY Channel Revenue" }
            ]}
            deepDive={{
                title: "Why Partner?",
                description: "AI is the biggest opportunity of the decade. Position your firm as a leader by delivering the most advanced autonomous solutions.",
                bullets: [
                    "Training: Get your team certified on the latest agentic workflows.",
                    "Leads: We route unmatched opportunities to our top partners.",
                    "Support: Dedicated channel managers to help you win deals."
                ]
            }}
        />
    );
}
