"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { ShoppingBag, Star, Download, Search, Tag, BadgeCheck } from "lucide-react";

export default function AgentfloxMarketplacePage() {
    return (
        <FeaturePageLayout
            badge="Global Ecosystem"
            title="The App Store for Intelligence"
            description="Accelerate your roadmap. Browse thousands of pre-built agents, workflows, and skills created by the community and vetted experts."
            heroVisual={
                <div className="w-full h-full p-6 grid grid-cols-2 gap-4 auto-rows-min">
                    {/* Search Bar Mock */}
                    <div className="col-span-2 bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/10 mb-2">
                        <Search size={14} className="text-gray-400" />
                        <div className="text-xs text-gray-500">Search for "legal assistant"...</div>
                    </div>
                    {/* Product Card 1 */}
                    <div className="bg-[#111] border border-white/10 rounded-xl p-3 hover:border-indigo-500/50 transition-colors">
                        <div className="flex justify-between mb-2">
                            <div className="w-8 h-8 rounded bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold">L</div>
                            <div className="text-[10px] bg-green-500/10 text-green-400 px-1 rounded h-fit">FREE</div>
                        </div>
                        <div className="text-xs font-bold text-white">Legal Reviewer</div>
                        <div className="flex gap-1 mt-1 text-yellow-500">
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                        </div>
                    </div>
                    {/* Product Card 2 */}
                    <div className="bg-[#111] border border-white/10 rounded-xl p-3 hover:border-indigo-500/50 transition-colors">
                        <div className="flex justify-between mb-2">
                            <div className="w-8 h-8 rounded bg-purple-900/50 flex items-center justify-center text-purple-400 font-bold">R</div>
                            <div className="text-[10px] bg-white/10 text-white px-1 rounded h-fit">$29</div>
                        </div>
                        <div className="text-xs font-bold text-white">React Refactor</div>
                        <div className="flex gap-1 mt-1 text-yellow-500">
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                            <Star size={8} fill="currentColor" />
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Verified Experts",
                    description: "Agents built by top law firms, accounting practices, and security researchers. Vetted for quality and safety.",
                    icon: BadgeCheck
                },
                {
                    title: "One-Click Install",
                    description: "Add powerful capabilities to your workspace instantly. No configuration or training required.",
                    icon: Download
                },
                {
                    title: "Monetize Your Skills",
                    description: "Build a specialized agent and sell it on the marketplace. Earn revenue every time it's run.",
                    icon: ShoppingBag
                }
            ]}
            stats={[
                { label: "Agents", value: "5,000+", subtext: "Available now" },
                { label: "Installs", value: "2M+", subtext: "Total downloads" },
                { label: "Revenue", value: "$4M+", subtext: "Paid to creators" }
            ]}
            deepDive={{
                title: "Build Once, Sell Everywhere",
                description: "The Agentflox Marketplace is the distribution channel for the AI era. Reach millions of enterprise users.",
                bullets: [
                    "Distribution: We put your agent in front of Fortune 500 companies.",
                    "Licensing: Flexible pricing models (per-seat, per-run, flat fee).",
                    "Security: We handle the hosting, scaling, and compliance."
                ]
            }}
        />
    );
}
