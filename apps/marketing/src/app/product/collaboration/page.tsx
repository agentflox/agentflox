"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Users, MessageSquare, Share2, Video, Globe2, Sparkles, Bot, UserPlus } from "lucide-react";

export default function CollaborationPage() {
    return (
        <FeaturePageLayout
            badge="Hybrid Workforce"
            title="Humans and AI, Better Together"
            description="Break down the silos between your team and your tools. In Agentflox, specialized agents live in your chat channels, ready to help at a moment's notice."
            heroVisual={
                <div className="flex flex-col gap-4 w-full max-w-sm mx-auto p-4">
                    {/* Chat Bubble: Human */}
                    <div className="flex items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-600 mb-1" />
                        <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none text-xs text-gray-200">
                            Can you analyze the Q3 sales data?
                        </div>
                    </div>
                    {/* Chat Bubble: AI */}
                    <div className="flex items-end gap-2 flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 mb-1 flex items-center justify-center"><Bot size={14} /></div>
                        <div className="bg-indigo-600/20 border border-indigo-600/30 p-3 rounded-2xl rounded-br-none text-xs text-indigo-100">
                            Sure. I found a 15% increase in MRR. Here is the chart breakdown...
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Active Participation",
                    description: "Agents don't wait to be spoken to. They monitor project channels and proactively suggest resources or flag risks.",
                    icon: UserPlus
                },
                {
                    title: "Shared Context",
                    description: "When you onboard a new human developer, the AI agent can walk them through the codebase and answer questions instantly.",
                    icon: MessageSquare
                },
                {
                    title: "Seamless Handoffs",
                    description: "Agents handle the grunt work (80%). When they hit a blocker, they tag the right human expert with a full summary.",
                    icon: Share2
                }
            ]}
            stats={[
                { label: "Response", value: "<500ms", subtext: "Average reply time" },
                { label: "Productivity", value: "+40%", subtext: "Tasks per person" },
                { label: "Onboarding", value: "-70%", subtext: "Time to first commit" },
                { label: "Channels", value: "∞", subtext: "Unlimited threads" }
            ]}
            deepDive={{
                title: "A New Way to Work",
                description: "Stop context switching between your IDE, Slack, and Jira. Bring the work to where the conversation is happening.",
                bullets: [
                    "Multi-Platform: Chat with agents in Slack, Discord, Microsoft Teams, or our web app.",
                    "Thread Summary: Ask an agent to 'catch you up' on a 500-message thread instantly.",
                    "Voice Mode: Join a huddle and talk to your AI project manager in real-time."
                ]
            }}
        />
    );
}
