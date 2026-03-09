"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Hammer, Puzzle, Zap, Move, GitBranch, Settings } from "lucide-react";

export default function AgentBuilderPage() {
    return (
        <FeaturePageLayout
            badge="Agent Builder"
            title="Design Intelligence Visually"
            description="No code required. Build complex, multi-modal agents using our drag-and-drop canvas. Define personality, tools, and permissions in minutes."
            heroVisual={
                <div className="w-full h-full bg-[#111] p-0 overflow-hidden relative border border-white/5 rounded-xl">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)] bg-[size:30px_30px] opacity-20" />

                    {/* Nodes */}
                    <div className="absolute top-1/4 left-1/4 bg-[#1e1e1e] border border-indigo-500 rounded-lg p-3 shadow-xl w-48">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-white">Trigger: Slack Msg</span>
                            <Zap size={12} className="text-indigo-400" />
                        </div>
                        <div className="h-1 w-full bg-indigo-500/20 rounded" />
                    </div>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1e1e1e] border border-green-500 rounded-lg p-3 shadow-xl w-48">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-white">Action: Analyze</span>
                            <BrainIcon size={12} className="text-green-400" />
                        </div>
                        <div className="text-[10px] text-gray-400">Model: GPT-4</div>
                    </div>

                    {/* Connector Line */}
                    <svg className="absolute inset-0 pointer-events-none">
                        <path d="M150 100 Q 250 100 250 150" stroke="gray" strokeWidth="2" fill="none" strokeDasharray="4" />
                    </svg>

                    {/* Palette */}
                    <div className="absolute top-4 left-4 bg-[#222] border border-white/10 rounded-lg p-2 flex flex-col gap-2">
                        <div className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-gray-400"><Puzzle size={16} /></div>
                        <div className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-gray-400"><GitBranch size={16} /></div>
                        <div className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer text-gray-400"><Settings size={16} /></div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Drag & Drop Canvas",
                    description: "Visualize the flow of information. Connect triggers, logic nodes, and actions with simple wires.",
                    icon: Move
                },
                {
                    title: "Prompt Engineering",
                    description: "Built-in playground to test and refine your system prompts. See how your agent behaves in real-time.",
                    icon: Hammer
                },
                {
                    title: "Tool Library",
                    description: "Access our pre-built library of 500+ tools (Search, Calculator, API Caller) and drop them onto your canvas.",
                    icon: Puzzle
                }
            ]}
            stats={[
                { label: "Build Time", value: "<5m", subtext: "Average agent" },
                { label: "Tools", value: "500+", subtext: "Ready to use" },
                { label: "Deployment", value: "1-Click", subtext: "To production" }
            ]}
        />
    );
}

import { Brain as BrainIcon } from "lucide-react";
