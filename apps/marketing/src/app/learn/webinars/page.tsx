"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Video, Calendar, Users, Mic, Presentation, PlaySquare } from "lucide-react";

export default function WebinarsPage() {
    return (
        <FeaturePageLayout
            badge="Webinars & Events"
            title="Live Learning Sessions"
            description="Deep dives with the product team, customer case studies, and live coding workshops. Join us live or watch on demand."
            heroVisual={
                <div className="w-full h-full p-4 flex flex-col items-center justify-center">
                    <div className="relative w-full aspect-video bg-[#0A0A0A] rounded-lg border border-white/10 overflow-hidden shadow-2xl">
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded animate-pulse">LIVE</div>
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer">
                                <PlaySquare size={24} className="text-white fill-white/20" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent">
                            <div className="text-xs font-bold text-white">Mastering Agent Memory</div>
                            <div className="text-[10px] text-gray-400">Speaker: Dr. Turing • 450 Watching</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Product Deep Dives",
                    description: "Learn how to use new features directly from the PMs and Engineers who built them.",
                    icon: Presentation
                },
                {
                    title: "Customer Stories",
                    description: "Hear how Fortune 500 companies are using Agentflox to scale their operations.",
                    icon: Users
                },
                {
                    title: "Office Hours",
                    description: "Weekly Q&A sessions where you can ask our solutions architects anything.",
                    icon: Mic
                }
            ]}
            stats={[
                { label: "Upcoming", value: "3", subtext: "This week" },
                { label: "Library", value: "200+", subtext: "On-demand hours" },
                { label: "Attendees", value: "5k", subtext: "Last event" }
            ]}
        />
    );
}
