"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Handshake, Globe, Gem, Mail } from "lucide-react";

export default function AffiliatesPage() {
    return (
        <FeaturePageLayout
            badge="Affiliate Program"
            title="Grow With Agentflox"
            description="Earn recurring commissions by referring businesses to the world's most advanced AI operating system."
            heroVisual={
                <div className="w-full h-full p-8 flex flex-col justify-center items-center gap-6">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center font-bold text-black text-2xl">YOU</div>
                        <div className="h-[2px] w-12 bg-green-500 animate-pulse" />
                        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-2xl">X</div>
                    </div>
                    <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full font-bold text-xl border border-green-500/50">
                        30% Recurring Commission
                    </div>
                </div>
            }
            features={[
                {
                    title: "High Commissions",
                    description: "Earn 30% of the recurring revenue for the first 12 months for every new customer you refer.",
                    icon: Gem
                },
                {
                    title: "Marketing Assets",
                    description: "Get access to high-converting banners, email copy, and exclusive webinars to help you promote.",
                    icon: Globe
                },
                {
                    title: "Dedicated Support",
                    description: "Our partner success managers are here to help you optimize your campaigns and close clearer.",
                    icon: Handshake
                }
            ]}
            stats={[
                { label: "Payouts", value: "$2M+", subtext: "Paid to partners" },
                { label: "Referrals", value: "10k+", subtext: "Successful signups" },
                { label: "Conversion", value: "8%", subtext: "Visitor to trial" }
            ]}
            deepDive={{
                title: "Join the Ecosystem",
                description: "We don't just want affiliates; we want partners. Help us bring the power of autonomous agents to every business.",
                bullets: [
                    "SaaS Consultants: Implement Agentflox for your clients.",
                    "Content Creators: Monetize your audience with high-ticket software.",
                    "Agencies: Whitelabel our platform (Enterprise tier only)."
                ]
            }}
        />
    );
}
