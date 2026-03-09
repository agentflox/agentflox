"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Headphones, LifeBuoy, Clock, MessageCircle, Video, ShieldCheck } from "lucide-react";

export default function SupportPage() {
    return (
        <FeaturePageLayout
            badge="Enterprise Support"
            title="We're Here for You 24/7"
            description="Mission-critical workloads require mission-critical support. Our global team of engineers is ready to help you at any time of day."
            heroVisual={
                <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-indigo-500 overflow-hidden border-4 border-[#0A0A0A] shadow-2xl relative z-10">
                            {/* Mock Avatar */}
                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">JS</div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-[#0A0A0A] w-8 h-8 rounded-full z-20" />

                        <div className="absolute top-1/2 left-full ml-4 bg-white/10 text-white p-3 rounded-xl rounded-tl-none w-48 backdrop-blur-md border border-white/10">
                            <div className="text-xs text-gray-400 mb-1">Jamie • Senior Engineer</div>
                            <div className="text-sm">Hi! I see you're having trouble with the WebSocket limit. Let me bump that for you.</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Dedicated Success Manager",
                    description: "A single point of contact who understands your architecture and business goals. No explaining your stack twice.",
                    icon: ShieldCheck
                },
                {
                    title: "15-Minute SLAs",
                    description: "For critical incidents, we guarantee a response from a senior engineer within 15 minutes.",
                    icon: Clock
                },
                {
                    title: "Private Slack Channel",
                    description: "Direct line to our engineering team. Chat with us just like you chat with your own colleagues.",
                    icon: MessageCircle
                }
            ]}
            stats={[
                { label: "CSAT Score", value: "99%", subtext: "Average rating" },
                { label: "Response", value: "<5m", subtext: "Median time" },
                { label: "Availability", value: "24/7", subtext: "365 Days" }
            ]}
            deepDive={{
                title: "More Than Just 'Support'",
                description: "We don't just fix bugs. We help you architect for scale, review code, and optimize costs.",
                bullets: [
                    "Architecture Reviews: Pre-launch audits to ensure your agent swarm is ready for production traffic.",
                    "Cost Optimization: Quarterly reviews to identify unused resources and save you money.",
                    "Feature Priority: Your requests go straight to the top of our product roadmap."
                ]
            }}
        />
    );
}
