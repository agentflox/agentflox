"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Lightbulb, Target, MessageSquare, Map, Users, LineChart } from "lucide-react";

export default function ProductManagementPage() {
    return (
        <FeaturePageLayout
            badge="For Product Teams"
            title="Turn Feedback into Features"
            description="Synthesize user needs, prioritize your roadmap, and write specs 10x faster. Let AI handle the discovery grunt work."
            heroVisual={
                <div className="w-full h-full p-8 flex flex-col gap-4">
                    <div className="bg-[#0A0A0A] p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between mb-2">
                            <div className="text-xs font-mono text-gray-400">INPUT: CUSTOMER FEEDBACK</div>
                            <div className="text-xs text-indigo-400">Analyzing 500+ items...</div>
                        </div>
                        <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i < 6 ? 'bg-indigo-500' : 'bg-gray-800'}`} />)}
                        </div>
                        <div className="space-y-2 mt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-8 bg-green-500 rounded-full" />
                                <div>
                                    <div className="text-sm text-white font-medium">Dark Mode Request</div>
                                    <div className="text-xs text-gray-500">Mentioned by 45 Enterprise users</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-8 bg-yellow-500 rounded-full" />
                                <div>
                                    <div className="text-sm text-white font-medium">API Latency Issues</div>
                                    <div className="text-xs text-gray-500">Critical priority tagged</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Feedback Synthesis",
                    description: "AI ingests thousands of support tickets, sales calls, and tweets to identify trending user pain points automatically.",
                    icon: MessageSquare
                },
                {
                    title: "Spec Writer",
                    description: "Turn a bulleted list into a comprehensive PRD. Agents draft acceptance criteria, edge cases, and user stories.",
                    icon: Target
                },
                {
                    title: "Roadmap Optimization",
                    description: "Visualize trade-offs. AI suggests prioritization based on effort vs. impact impact analysis.",
                    icon: Map
                }
            ]}
            stats={[
                { label: "Discovery Time", value: "-70%", subtext: "Faster insights" },
                { label: "Spec Quality", value: "100%", subtext: "Standardized" },
                { label: "Features Shipped", value: "+25%", subtext: "Quarterly" }
            ]}
            deepDive={{
                title: "Build the Right Thing",
                description: "Stop guessing what to build next. Agentflox gives you a data-backed confidence score for every item on your backlog.",
                bullets: [
                    "Sentiment Analysis: Know exactly how users feel about your latest release.",
                    "Competitor Tracking: Agents monitor your rivals' changelogs and alert you to new features.",
                    "Release Notes: Auto-generated from Jira tickets, written in your brand voice."
                ]
            }}
        />
    );
}
