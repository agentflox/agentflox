"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Store, TrendingUp, Users, Clock, MessageCircle, BarChart3 } from "lucide-react";

export default function SMBPage() {
    return (
        <FeaturePageLayout
            badge="Small & Growing Business"
            title="Enterprise Power, SMB Budget"
            description="Level the playing field. Access the same AI tools used by Fortune 500s to automate customer service, marketing, and operations."
            heroVisual={
                <div className="w-full h-full p-6 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-4 bg-[#0A0A0A] p-4 rounded-xl border border-white/10 shadow-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <MessageCircle size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">Incoming Support Tickets</div>
                            <div className="text-lg font-bold text-white">24/7 Response</div>
                        </div>
                        <div className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">Active</div>
                    </div>
                    <div className="flex items-center gap-4 bg-[#0A0A0A] p-4 rounded-xl border border-white/10 shadow-lg opacity-80 scale-95">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">Marketing Campaigns</div>
                            <div className="text-lg font-bold text-white">Auto-Optimized</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Automated Support",
                    description: "Deploy a Support Agent that answers FAQs, processes refunds, and schedules appointments instantly.",
                    icon: MessageCircle
                },
                {
                    title: "Marketing on Autopilot",
                    description: "Generate SEO blog posts, social media content, and email newsletters tailored to your brand voice.",
                    icon: TrendingUp
                },
                {
                    title: "Operational Efficiency",
                    description: "Automate invoicing, payroll reminders, and inventory tracking. Stop doing busywork.",
                    icon: Clock
                }
            ]}
            stats={[
                { label: "Hours Saved", value: "20/wk", subtext: "Per Employee" },
                { label: "Response", value: "Instant", subtext: "Support Time" },
                { label: "Growth", value: "3x", subtext: "Lead Gen" }
            ]}
            deepDive={{
                title: "Punch Above Your Weight",
                description: "You don't need a massive team to compete. Agentflox gives you a digital workforce that works 24/7/365 at a fraction of the cost.",
                bullets: [
                    "No Sick Days: Agents are always on and ready to work.",
                    "Instant Training: Install pre-trained agents for Accounting, HR, or Sales.",
                    "Pay as You Grow: Flexible pricing that scales with your revenue."
                ]
            }}
        />
    );
}
