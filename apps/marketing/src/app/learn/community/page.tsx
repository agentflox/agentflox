"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { MessageSquare, Users, Heart, Award, HelpCircle, MessageCircle } from "lucide-react";

export default function CommunityPage() {
    return (
        <FeaturePageLayout
            badge="Community"
            title="Join the Movement"
            description="Connect with thousands of developers, creators, and enterprise leaders building the future with Agentflox."
            heroVisual={
                <div className="w-full h-full p-6 grid grid-cols-2 gap-4">
                    {/* Discord Mock */}
                    <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={16} className="text-[#5865F2]" />
                            <span className="text-xs font-bold text-white">Discord</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                                <div className="w-4 h-4 rounded-full bg-gray-600" />
                                <div className="h-1 w-16 bg-gray-700 rounded" />
                            </div>
                            <div className="flex gap-2 items-center">
                                <div className="w-4 h-4 rounded-full bg-gray-600" />
                                <div className="h-1 w-20 bg-gray-700 rounded" />
                            </div>
                            <div className="text-[10px] text-green-400 mt-2">● 1,240 Online</div>
                        </div>
                    </div>
                    {/* Forum Mock */}
                    <div className="bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={16} className="text-[#FF4500]" />
                            <span className="text-xs font-bold text-white">Forum</span>
                        </div>
                        <div className="text-[10px] text-gray-300">
                            <div className="mb-1">Top Topic:</div>
                            <div className="font-bold text-white">Best practices for multi-agent memory?</div>
                            <div className="mt-2 text-gray-500">24 replies • 5m ago</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Discussion Forums",
                    description: "Get help, share your projects, and discuss the latest in AI agents with peers.",
                    icon: MessageSquare
                },
                {
                    title: "Events & Meetups",
                    description: "Join us for hackathons, user groups, and annual conferences in cities around the world.",
                    icon: Users
                },
                {
                    title: "Community Heroes",
                    description: "We recognize and reward top contributors with exclusive swag, early access, and profile badges.",
                    icon: Award
                }
            ]}
            stats={[
                { label: "Members", value: "50k+", subtext: "Global" },
                { label: "Daily Msgs", value: "10k+", subtext: "Discord" },
                { label: "Answer Time", value: "<10m", subtext: "Community support" }
            ]}
        />
    );
}
