"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Gavel, AlertTriangle, Copyright, CreditCard, Ban, Scale } from "lucide-react";

export default function TermsPage() {
    return (
        <FeaturePageLayout
            badge="Terms of Service"
            title="Rules of Engagement"
            description="Our terms govern your use of the Agentflox platform. Written in plain English where possible."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center font-serif text-gray-400 italic text-2xl text-center">
                    "Agreements made on<br /><span className="text-white not-italic font-sans font-bold">Trust & Verification</span>"
                </div>
            }
            features={[
                {
                    title: "Acceptable Use",
                    description: "What you can and cannot do with our agents. No malware, no harassment, no illegal content.",
                    icon: Ban
                },
                {
                    title: "Payment Terms",
                    description: "Details on billing cycles, refunds, and subscription tiers.",
                    icon: CreditCard
                },
                {
                    title: "Intellectual Property",
                    description: "You own the inputs and outputs. We own the platform and algorithms.",
                    icon: Copyright
                }
            ]}
            stats={[
                { label: "Updates", value: "Yearly", subtext: "Review cycle" },
                { label: "SLA", value: "99.9%", subtext: "Uptime commitment" },
                { label: "Support", value: "24/7", subtext: "For Enterprise" }
            ]}
        />
    );
}

import { FileText } from "lucide-react";
