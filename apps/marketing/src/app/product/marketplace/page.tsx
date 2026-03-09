"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Globe, Download, Star, Search, BadgeCheck, Zap, TrendingUp, DollarSign } from "lucide-react";

export default function MarketplacePage() {
    return (
        <FeaturePageLayout
            badge="Global Agent Marketplace"
            title="Intelligence on Demand"
            description="Why build from scratch? Access a library of 5,000+ pre-trained, verified AI agents built by domain experts. Install capabilities in seconds."
            heroVisual={
                <div className="grid grid-cols-2 gap-4 w-full h-full p-6 content-center">
                    {/* Agent Cards */}
                    {[
                        { name: "Sales SDR", color: "bg-blue-500" },
                        { name: "QA Tester", color: "bg-green-500" },
                        { name: "Legal Auditor", color: "bg-purple-500" },
                        { name: "Data Analyst", color: "bg-orange-500" }
                    ].map((agent, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className={`w-8 h-8 rounded-lg ${agent.color}/20 flex items-center justify-center text-white text-xs`}>AI</div>
                                <div className="p-1 bg-white/5 rounded hover:bg-white/20"><Download size={12} /></div>
                            </div>
                            <div className="text-xs font-semibold text-gray-200">{agent.name}</div>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(s => <div key={s} className="w-1 h-1 rounded-full bg-yellow-500/50" />)}
                            </div>
                        </div>
                    ))}
                </div>
            }
            features={[
                {
                    title: "Verified & Sandboxed",
                    description: "Every agent is rigorously tested for security and performance. They run in isolated containers to ensure safety.",
                    icon: BadgeCheck
                },
                {
                    title: "One-Click Deployment",
                    description: "Find the capability you need—e.g., 'React Unit Tester'—and add it to your project team instantly.",
                    icon: Zap
                },
                {
                    title: "Creator Economy",
                    description: "Build your own specialized agents and sell them to the ecosystem. Earn revenue every time your agent performs a task.",
                    icon: DollarSign
                }
            ]}
            stats={[
                { label: "Library", value: "5k+", subtext: "Verified Agents" },
                { label: "Creators", value: "1.2k", subtext: "Active Developers" },
                { label: "Installs", value: "2M+", subtext: "To date" },
                { label: "Revenue", value: "$4M+", subtext: "Paid to creators" }
            ]}
            deepDive={{
                title: "Accelerate Your Roadmap",
                description: "The marketplace allows you to outsource complex, non-core functions to AI specialized by experts. Focus on your USP.",
                bullets: [
                    "Domain Expertise: Use a 'Legal' agent trained by lawyers, or a 'DevOps' agent trained by SREs.",
                    "Continuous Updates: Agents improve over time as creators release new versions.",
                    "Review System: Transparent ratings and reviews from other enterprise users."
                ]
            }}
        />
    );
}
