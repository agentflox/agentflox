"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Megaphone, BarChart, PenTool, Mail, Target, Layers } from "lucide-react";

export default function MarketingPage() {
    return (
        <FeaturePageLayout
            badge="For Marketing Teams"
            title="The Infinite Creative Studio"
            description="Scale your content engine without scaling your headcount. AI agents research, write, design, and optimize campaigns 24/7."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="relative w-full max-w-sm aspect-[4/5] bg-white rounded-lg shadow-2xl p-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        {/* Mock Social Post */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-600 rounded-full" />
                            <div>
                                <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
                                <div className="h-2 w-16 bg-gray-100 rounded" />
                            </div>
                        </div>
                        <div className="h-48 bg-indigo-50 rounded mb-4 flex items-center justify-center text-indigo-200">
                            Generated Image
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-gray-100 rounded" />
                            <div className="h-2 w-full bg-gray-100 rounded" />
                            <div className="h-2 w-3/4 bg-gray-100 rounded" />
                        </div>
                        {/* AI Badge */}
                        <div className="absolute -top-4 -right-4 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
                            VIRAL SCORE: 98/100
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Campaign Orchestration",
                    description: "Define a goal (e.g., 'Launch Webinar'), and agents generate the landing page copy, email sequences, and ad creatives automatically.",
                    icon: Megaphone
                },
                {
                    title: "SEO Writer",
                    description: "Not just generic text. Agents analyze SERP data to write high-ranking, semantic-rich content that reads like a human expert.",
                    icon: PenTool
                },
                {
                    title: "Performance Analyst",
                    description: "Connect to GA4 and LinkedIn Ads. AI monitors ROAS in real-time and toggles budgets to maximize conversion.",
                    icon: BarChart
                }
            ]}
            stats={[
                { label: "Content Output", value: "10x", subtext: "Volume increased" },
                { label: "CAC", value: "-40%", subtext: "Optimization" },
                { label: "Ranking Keys", value: "+200%", subtext: "SEO Growth" }
            ]}
            deepDive={{
                title: "Personalization at Scale",
                description: "The era of 'spray and pray' is over. Agentflox agents create unique, 1:1 messaging for every segment of your audience.",
                bullets: [
                    "Dynamic Email: Agents rewrite email copy based on the recipient's industry and role.",
                    "AB Testing: Automate thousands of headline variations to find the winner instantly.",
                    "Social Listening: Agents monitor brand mentions and draft witty responses for approval."
                ]
            }}
        />
    );
}
