"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Eye, Cookie, Server, Globe, UserCheck, Shield } from "lucide-react";

export default function PrivacyPage() {
    return (
        <FeaturePageLayout
            badge="Privacy Policy"
            title="Your Data, Your Control"
            description="We believe privacy is a fundamental right. We design our systems to minimize data collection and maximize security."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="relative w-48 h-48">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
                        <div className="absolute inset-4 bg-[#0A0A0A] rounded-full border border-green-500/50 flex items-center justify-center">
                            <Shield size={64} className="text-green-500" />
                        </div>
                        {/* Data flowing in but protected */}
                        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Data Minimization",
                    description: "We only collect what we need to provide the service. No third-party data selling, ever.",
                    icon: Eye
                },
                {
                    title: "Cookie Policy",
                    description: "Transparent breakdown of the cookies we use for functionality and analytics.",
                    icon: Cookie
                },
                {
                    title: "Data Residency",
                    description: "Choose where your data lives. We support regions in US, EU, and APAC.",
                    icon: Server
                }
            ]}
            stats={[
                { label: "Encryption", value: "AES-256", subtext: "At rest & transit" },
                { label: "Transparency", value: "100%", subtext: "Open data practices" },
                { label: "Export", value: "Anytime", subtext: "Your data is yours" }
            ]}
        />
    );
}
