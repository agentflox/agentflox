"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { TrendingUp, PhoneCall, Mail, UserCheck, Target, Zap } from "lucide-react";

export default function SalesPage() {
    return (
        <FeaturePageLayout
            badge="For Sales Teams"
            title="Close Deals in Your Sleep"
            description="Your AI salesforce never sleeps. Agents research leads, personalize outreach, and book meetings 24/7."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="w-full max-w-sm bg-[#0A0A0A] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                        <div className="bg-white/5 p-4 border-b border-white/10">
                            <div className="text-xs font-mono text-gray-500 mb-1">PIPELINE MONITOR</div>
                            <div className="text-2xl font-bold text-white">$1.2M <span className="text-sm font-normal text-green-400">▲ +15%</span></div>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <div className="flex-1 text-sm text-gray-300">New Leads (Cold)</div>
                                <div className="text-sm font-mono text-white">450</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <div className="flex-1 text-sm text-gray-300">Replied (Warm)</div>
                                <div className="text-sm font-mono text-white">92</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <div className="flex-1 text-sm text-gray-300">Booked Demo</div>
                                <div className="text-sm font-mono text-white">28</div>
                            </div>
                        </div>
                        {/* Activity Stream */}
                        <div className="bg-green-500/10 p-2 text-[10px] text-green-400 text-center border-t border-green-500/20">
                            ⚡ Agent just booked a demo with CTO @ Acme
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Lead Research",
                    description: "Before you dial, AI scrapes LinkedIn, news sites, and funding reports to give you a one-page dossier on the prospect.",
                    icon: Search
                },
                {
                    title: "Autonomous Outbound",
                    description: "Agents send hyper-personalized emails at scale. They handle the back-and-forth until a meeting is booked.",
                    icon: Mail
                },
                {
                    title: "CRM Hygiene",
                    description: "Never manually update Salesforce again. Agents listen to calls and update deal stages, notes, and next steps automatically.",
                    icon: UserCheck
                }
            ]}
            stats={[
                { label: "Pipeline Value", value: "3x", subtext: "Coverage" },
                { label: "Response Rate", value: "12%", subtext: "Cold Outreach" },
                { label: "Admin Time", value: "0", subtext: "CRM Updates" }
            ]}
            deepDive={{
                title: "The top 1% Rep, Cloned",
                description: "Imagine if your best BDR could work 24 hours a day. Agentflox agents follow your best playbooks without fatigue or deviation.",
                bullets: [
                    " objection Handling: AI suggests real-time answers during calls based on winning transcripts.",
                    "Pricing Intelligence: Agents analyze win/loss data to suggest the optimal discount rate.",
                    "SDR Coaching: Junior reps get real-time feedback on their email drafts before sending."
                ]
            }}
        />
    );
}

import { Search } from "lucide-react";
