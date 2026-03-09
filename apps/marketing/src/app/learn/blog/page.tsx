"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Book, User, Calendar, Tag, ArrowRight } from "lucide-react";

export default function BlogPage() {
    return (
        <FeaturePageLayout
            badge="Engineering Blog"
            title="Thoughts on AI & Systems"
            description="Deep dives into how we're building the future of work. Engineering challenges, product philosophy, and industry trends."
            heroVisual={
                <div className="flex flex-col gap-4 w-full h-full p-8 justify-center">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 hover:bg-white/10 transition-colors cursor-pointer">
                        <div className="w-20 h-20 bg-indigo-500/20 rounded-lg shrink-0" />
                        <div>
                            <div className="text-[10px] text-indigo-400 font-bold mb-1">ENGINEERING</div>
                            <h3 className="text-sm font-bold text-white leading-tight mb-2">Scaling WebSocket Connections to 10M Concurrent Users</h3>
                            <div className="text-xs text-gray-500">Oct 12 • By Sarah Drasner</div>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 hover:bg-white/10 transition-colors cursor-pointer opacity-70">
                        <div className="w-20 h-20 bg-green-500/20 rounded-lg shrink-0" />
                        <div>
                            <div className="text-[10px] text-green-400 font-bold mb-1">PRODUCT</div>
                            <h3 className="text-sm font-bold text-white leading-tight mb-2">Why Chat Interfaces Are Just the Beginning</h3>
                            <div className="text-xs text-gray-500">Oct 08 • By The Founders</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Engineering",
                    description: "Technical post-mortems, architecture decisions, and code snippets from our core team.",
                    icon: Code
                },
                {
                    title: "Product Updates",
                    description: "Changelogs and feature deep dives. See what's new in the Agentflox platform this week.",
                    icon: Tag
                },
                {
                    title: "Culture",
                    description: "How we work, how we hire, and our values as a remote-first AI company.",
                    icon: User
                }
            ]}
            stats={[
                { label: "Readers", value: "50k+", subtext: "Monthly" },
                { label: "Posts", value: "2/wk", subtext: "Frequency" },
                { label: "Subscribers", value: "15k", subtext: "Newsletter" }
            ]}
        />
    );
}

import { Code } from "lucide-react";
