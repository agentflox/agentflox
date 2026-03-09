"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { GraduationCap, Play, Code, CheckCircle2, Rocket } from "lucide-react";

export default function TutorialsPage() {
    return (
        <FeaturePageLayout
            badge="Tutorials"
            title="Learn by Building"
            description="Step-by-step guides to build real-world applications with Agentflox. From 'Hello World' to production-grade agents."
            heroVisual={
                <div className="grid grid-cols-2 gap-4 w-full h-full p-6 content-center">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2"><Rocket size={16} /></div>
                        <h4 className="text-sm font-bold text-white mb-1">Build a Support Bot</h4>
                        <div className="h-1 w-full bg-gray-700 rounded overflow-hidden">
                            <div className="h-full bg-blue-500 w-3/4" />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">15 min • Beginner</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer opacity-50">
                        <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2"><Code size={16} /></div>
                        <h4 className="text-sm font-bold text-white mb-1">Custom Tools</h4>
                        <div className="h-1 w-full bg-gray-700 rounded overflow-hidden">
                            <div className="h-full bg-purple-500 w-0" />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">30 min • Intermediate</div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Interactive Labs",
                    description: "Code directly in the browser. Our cloud IDE provides a pre-configured environment for every tutorial.",
                    icon: Code
                },
                {
                    title: "Video Walkthroughs",
                    description: "Watch our engineers build features live. Pause, rewind, and copy the code as you go.",
                    icon: Play
                },
                {
                    title: "Certification",
                    description: "Complete the track to earn the 'Agentflox Certified Developer' badge for your LinkedIn profile.",
                    icon: GraduationCap
                }
            ]}
            stats={[
                { label: "Courses", value: "50+", subtext: "Free access" },
                { label: "Community", value: "20k", subtext: "Students" },
                { label: "Certified", value: "5k+", subtext: "Developers" }
            ]}
        />
    );
}
