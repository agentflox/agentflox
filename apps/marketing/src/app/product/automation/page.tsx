"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Workflow, Zap, GitMerge, Clock, ShieldCheck, Layout, Boxes } from "lucide-react";

export default function AutomationPage() {
    return (
        <FeaturePageLayout
            badge="Intelligent Workflows"
            title="Automation that Adapts to Chaos"
            description="Build resilient, self-healing workflows. Traditional automation breaks when data changes—Agentflox's AI agents adapt, retry, and resolve edge cases automatically."
            heroVisual={
                <div className="w-full h-full relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    {/* Abstract Workflow Visual */}
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Boxes size={24} className="text-gray-400" /></div>
                        <div className="h-1 w-12 bg-white/10 relative overflow-hidden">
                            <div className="absolute inset-0 bg-indigo-500 w-1/2 animate-[shimmer_2s_infinite]" />
                        </div>
                        <div className="w-16 h-16 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]"><Zap size={24} className="text-indigo-400" /></div>
                        <div className="h-1 w-12 bg-white/10" />
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><Layout size={24} className="text-gray-400" /></div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Visual Flow Builder",
                    description: "Drag-and-drop interface to design complex agent chains. Visualize dependencies, logic paths, and fallbacks instantly.",
                    icon: Layout
                },
                {
                    title: "Human-in-the-Loop Gates",
                    description: "Set approval thresholds. If an agent's confidence score drops below 90%, it automatically pings a human for review.",
                    icon: ShieldCheck
                },
                {
                    title: "Event-Driven Triggers",
                    description: "Launch workflows from webhooks, database changes, GitHub PRs, or Slack messages. Real-time response to business signals.",
                    icon: Zap
                }
            ]}
            stats={[
                { label: "Throughput", value: "1M+", subtext: "Automations / Day" },
                { label: "Success Rate", value: "99.9%", subtext: "Self-healing enabled" },
                { label: "Latency", value: "<50ms", subtext: "Event-to-Action" },
                { label: "Cost Savings", value: "60%", subtext: "vs Traditional RPA" }
            ]}
            deepDive={{
                title: "From Rigid Scripts to Fluid Logic",
                description: "Old-school automation requires every step to be strictly defined. Agentflox workflows use 'Goal-Oriented' nodes where you define the 'What' and the AI figures out the 'How'.",
                bullets: [
                    "Dynamic Pathing: AI chooses the best tool for the job at runtime.",
                    "Error Recovery: Agents read error logs and try alternative methods.",
                    "Unstructured Data: Parse PDFs, loose text, and websites effortlessly."
                ]
            }}
        />
    );
}
