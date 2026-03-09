"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Rocket, Zap, TrendingUp, Users, Target, BarChart } from "lucide-react";

export default function StartupsPage() {
    return (
        <FeaturePageLayout
            badge="For Startups"
            title="Move Fast. Break Nothing."
            description="Achieve product-market fit faster with an AI workforce. Scale your engineering and ops without bloating your burn rate."
            heroVisual={
                <div className="w-full h-full flex items-center justify-center p-8">
                    <div className="relative w-full max-w-sm bg-[#0A0A0A] rounded-xl border border-white/10 p-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white">Burn Rate</h3>
                            <span className="text-xs text-green-400 font-mono">-40%</span>
                        </div>
                        <div className="h-24 flex items-end gap-2">
                            {[20, 35, 45, 30, 25, 20, 15].map((h, i) => (
                                <div key={i} className="flex-1 bg-white/5 rounded-t hover:bg-white/10 transition-colors relative group">
                                    <div className="absolute bottom-0 w-full bg-indigo-500/50 rounded-t" style={{ height: `${h}%` }} />
                                    {i > 3 && <div className="absolute bottom-0 w-full bg-green-500/50 rounded-t animate-pulse" style={{ height: `${h * 0.5}%` }} />}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Traditional</div>
                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> With Agentflox</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Instant Engineering Team",
                    description: "Deploy Junior Dev agents to handle testing, documentation, and routine refactoring. Keep your Senior Devs focused on core features.",
                    icon: Users
                },
                {
                    title: "24/7 Ops",
                    description: "Automate your infrastructure scaling and monitoring. Startups don't sleep, and neither should your DevOps.",
                    icon: Zap
                },
                {
                    title: "Pitch Deck Prep",
                    description: "Agents can analyze market data and competitor pricing to generate data-backed slides for investors.",
                    icon: BarChart
                }
            ]}
            stats={[
                { label: "Launch Time", value: "2x", subtext: "Faster GTM" },
                { label: "Cost", value: "-60%", subtext: "vs Traditional Hiring" },
                { label: "Runway", value: "+9mo", subtext: "Extended" }
            ]}
            deepDive={{
                title: "Scale Like a unicorn, Spend like a Seed",
                description: "The biggest killer of startups is premature scaling. Agentflox allows you to scale your output elastically without the fixed cost of headcount.",
                bullets: [
                    "Elastic Workforce: Spin up marketing agents only when you launch a campaign.",
                    "No Overhead: No payroll taxes, benefits, or recruiting fees.",
                    "Focus: Automate the 'business chores' so founders can focus on product."
                ]
            }}
        />
    );
}
