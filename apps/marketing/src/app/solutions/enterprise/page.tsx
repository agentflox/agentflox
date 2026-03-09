"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Building2, Lock, FileCheck, Globe2, Server, Key, ShieldAlert, Fingerprint } from "lucide-react";

export default function EnterprisePage() {
    return (
        <FeaturePageLayout
            badge="Agentflox Enterprise"
            title="Scale AI with Military-Grade Security"
            description="The power of autonomous agents meets the rigor of enterprise compliance. Deploy with confidence using our private cloud, RBAC, and audit infrastructure."
            heroVisual={
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="relative w-64 h-64 border border-indigo-500/30 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
                        <div className="absolute inset-0 border-t border-indigo-500 rounded-full opacity-50" />
                        <ShieldAlert size={64} className="text-indigo-400 relative z-10 animate-none" />
                        {/* Orbiting Satellites */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-6 h-6 bg-[#0A0A0A] border border-green-500 rounded-full flex items-center justify-center">
                            <Lock size={12} className="text-green-500" />
                        </div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-3 w-6 h-6 bg-[#0A0A0A] border border-blue-500 rounded-full flex items-center justify-center">
                            <Fingerprint size={12} className="text-blue-500" />
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "SSO & Identity Management",
                    description: "Seamless integration with Okta, Azure AD, and Google Workspace. Enforce MFA and automate user provisioning via SCIM.",
                    icon: Key
                },
                {
                    title: "Private VPC Deployment",
                    description: "Run Agentflox completely within your own AWS/GCP VPC. Your data never leaves your controlled environment.",
                    icon: Server
                },
                {
                    title: "Advanced Audit Logs",
                    description: "Every agent thought, action, and tool output is logged, timestamped, and immutable for compliance reviews.",
                    icon: FileCheck
                }
            ]}
            stats={[
                { label: "Uptime SLA", value: "99.99%", subtext: "Financially backed" },
                { label: "Compliance", value: "SOC2", subtext: "Type II Certified" },
                { label: "Support", value: "24/7", subtext: "Dedicated Engineer" },
                { label: "Retention", value: "7 Yrs", subtext: "Audit Log Storage" }
            ]}
            deepDive={{
                title: "Zero-Trust Architecture",
                description: "We assume threats exist both inside and outside the network. Every agent interaction is authenticated, authorized, and encrypted.",
                bullets: [
                    "Data Encryption: AES-256 at rest and TLS 1.3 in transit.",
                    "Secret Management: API keys are vaulted and never exposed to the frontend.",
                    "Model Agnostic Privacy: We don't train our models on your proprietary data."
                ]
            }}
        />
    );
}
