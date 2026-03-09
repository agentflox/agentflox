"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Users, Target, Heart, Zap, Award, Globe } from "lucide-react";

export default function AboutPage() {
    return (
        <FeaturePageLayout
            badge="About Us"
            title="Building the Future of Work"
            description="We are on a mission to liberate humans from repetitive tasks. By orchestrating autonomous agents, we empower teams to focus on creativity and strategy."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20" />
                        <div className="relative bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl text-center max-w-sm">
                            <div className="text-4xl font-bold text-white mb-2">1,000+</div>
                            <div className="text-sm text-gray-400 uppercase tracking-widest">Years Saved</div>
                            <div className="mt-4 text-xs text-gray-500">
                                Since our launch in 2024, our agents have automated over 8 million hours of manual work.
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Our Mission",
                    description: "To create a world where software works for you, not the other way around. Intelligence should be a utility.",
                    icon: Target
                },
                {
                    title: "Our Values",
                    description: "Transparency, speed, and user-centricity. We build tools that grant superpowers without the learning curve.",
                    icon: Heart
                },
                {
                    title: "Our Team",
                    description: "A diverse group of engineers, researchers, and designers from ex-Google, OpenAI, and Stripe.",
                    icon: Users
                }
            ]}
            stats={[
                { label: "Founded", value: "2024", subtext: "San Francisco" },
                { label: "Team", value: "50+", subtext: "Remote-first" },
                { label: "Backing", value: "$20M", subtext: "Series A" }
            ]}
            deepDive={{
                title: "The Agentflox Story",
                description: "It started with a simple question: Why are we still copy-pasting data between tabs? What started as a script is now an operating system.",
                bullets: [
                    "2024: Founded by Sarah Chen and Mike Torres.",
                    "2025: Released first autonomous agent SDK.",
                    "2026: Reached 10,000 enterprise customers."
                ]
            }}
        />
    );
}
