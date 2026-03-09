"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Workflow, ClipboardList, Gauge, Zap, Cog, Activity } from "lucide-react";

export default function OperationsPage() {
    return (
        <FeaturePageLayout
            badge="For Operations"
            title="Operational Excellence as Code"
            description="Replace manual SOPs with self-executing workflows. Streamline procurement, facilities, and internal approvals."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="relative w-64 h-64">
                        {/* Central Gear */}
                        <div className="absolute inset-0 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                            <Cog size={120} className="text-white/10" strokeWidth={0.5} />
                        </div>
                        {/* Satellite Nodes */}
                        {[0, 72, 144, 216, 288].map((deg, i) => {
                            const rad = deg * (Math.PI / 180);
                            const x = Math.cos(rad) * 80;
                            const y = Math.sin(rad) * 80;
                            return (
                                <div
                                    key={i}
                                    className="absolute w-12 h-12 rounded-xl bg-[#0A0A0A] border border-white/20 flex items-center justify-center shadow-lg"
                                    style={{ top: `calc(50% + ${y}px - 24px)`, left: `calc(50% + ${x}px - 24px)` }}
                                >
                                    {i === 0 && <Workflow size={20} className="text-indigo-400" />}
                                    {i === 1 && <ClipboardList size={20} className="text-green-400" />}
                                    {i === 2 && <Zap size={20} className="text-yellow-400" />}
                                    {i === 3 && <Gauge size={20} className="text-red-400" />}
                                    {i === 4 && <Activity size={20} className="text-blue-400" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            }
            features={[
                {
                    title: "SOP Enforcement",
                    description: "Ensure 100% compliance. Agents follow your standard operating procedures strictly, logging every step for audit.",
                    icon: ClipboardList
                },
                {
                    title: "Procurement Auto-Pilot",
                    description: "From request to PO to payment. Agents handle vendor communication and compare quotes automatically.",
                    icon: Workflow
                },
                {
                    title: "Incident Response",
                    description: "When a system goes down or a facility issue is reported, AI instantly triages and pages the right on-call staff.",
                    icon: Activity
                }
            ]}
            stats={[
                { label: "Process Time", value: "-80%", subtext: "Average cycle" },
                { label: "Compliance", value: "100%", subtext: "Audit readiness" },
                { label: "Cost", value: "-30%", subtext: "Operational overhead" }
            ]}
            deepDive={{
                title: "The Invisible Backpack",
                description: "Ops teams carry the invisible weight of 'keeping the lights on'. Agentflox automates the maintenance so you can build new systems.",
                bullets: [
                    "Vendor Management: Auto-renew contracts or flag price increases for review.",
                    "Onboarding Logistics: Automatically order laptops and keycards for new hires.",
                    "Data Entry: OCR agents read invoices and receipts, syncing them to your ERP instantly."
                ]
            }}
        />
    );
}
