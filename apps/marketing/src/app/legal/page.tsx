"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Scale, Lock, ShieldCheck, Mail } from "lucide-react";

export default function LegalPage() {
    return (
        <FeaturePageLayout
            badge="Legal"
            title="Legal Hub"
            description="Transparency is our policy. Here you'll find all our legal terms, policies, and compliance documents."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-xl max-w-sm w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <Scale size={32} className="text-gray-400" />
                            <div className="text-lg font-bold text-white">Agentflox Legal</div>
                        </div>
                        <div className="space-y-3">
                            <div className="h-2 w-full bg-gray-800 rounded" />
                            <div className="h-2 w-full bg-gray-800 rounded" />
                            <div className="h-2 w-2/3 bg-gray-800 rounded" />
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between text-xs text-gray-500">
                            <span>Last Updated:</span>
                            <span>Oct 2025</span>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Terms of Service",
                    description: "The rules for using our platform. Covers account usage, payment terms, and acceptable use.",
                    icon: Scale
                },
                {
                    title: "Privacy Policy",
                    description: "How we collect, use, and protect your data. We are GDPR and CCPA compliant.",
                    icon: Lock
                },
                {
                    title: "Security Policy",
                    description: "Our commitment to keeping your data safe. Details on encryption, access controls, and audits.",
                    icon: ShieldCheck
                }
            ]}
            stats={[
                { label: "Compliance", value: "SOC2", subtext: "Type II Certified" },
                { label: "GDPR", value: "Ready", subtext: "Data Processing" },
                { label: "Uptime", value: "99.9%", subtext: "SLA Guarantee" }
            ]}
        />
    );
}
