"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { LayoutGrid, ListTodo, KanbanSquare, Calendar, PieChart, Users, ArrowUpRight } from "lucide-react";

export default function ProjectManagementPage() {
    return (
        <FeaturePageLayout
            badge="Autonomous Project Management"
            title="The Project Manages Itself"
            description="Stop nagging your team for status updates. Agentflox's PM agents track commits, update tickets, and predict delays automatically."
            heroVisual={
                <div className="w-full h-full p-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center mb-2">
                        <div className="font-mono text-xs text-gray-400">BOARD: Q4 LAUNCH</div>
                        <div className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded">AUTO-SYNC</div>
                    </div>
                    <div className="flex gap-3 h-full">
                        {/* Columns */}
                        {[1, 2, 3].map(col => (
                            <div key={col} className="flex-1 bg-white/5 rounded-lg p-2 flex flex-col gap-2">
                                <div className="h-1.5 w-12 bg-white/10 rounded mb-1" />
                                <div className="bg-white/5 p-2 rounded border border-white/5">
                                    <div className="h-1 w-full bg-white/10 rounded mb-2" />
                                    <div className="flex justify-between">
                                        <div className="w-4 h-4 rounded-full bg-orange-500/20" />
                                        <div className="w-8 h-1 bg-white/10 rounded" />
                                    </div>
                                </div>
                                {col === 2 && (
                                    <div className="relative bg-indigo-500/10 p-2 rounded border border-indigo-500/30">
                                        <div className="h-1 w-full bg-indigo-500/20 rounded mb-2" />
                                        <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] px-1 rounded-full">MOVED</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            }
            features={[
                {
                    title: "Zero-Touch Updates",
                    description: "Status columns move themselves. A merged PR automatically moves the associated ticket to 'QA Ready'. No dragging required.",
                    icon: KanbanSquare
                },
                {
                    title: "Smart Resource Balancing",
                    description: "AI detects when a developer is overloaded and suggests re-assigning non-critical tasks to prevent burnout.",
                    icon: PieChart
                },
                {
                    title: "Predictive Timelines",
                    description: "Forget 'gut feel' estimates. Agentflox analyzes historical team velocity to project accurate delivery dates dynamically.",
                    icon: Calendar
                }
            ]}
            stats={[
                { label: "Admin Time", value: "-90%", subtext: "Less time in Jira" },
                { label: "Accuracy", value: "95%", subtext: "Sprint Planning" },
                { label: "Velocity", value: "+30%", subtext: "Features shipped" },
                { label: "Updates", value: "Auto", subtext: "Real-time sync" }
            ]}
            deepDive={{
                title: "Everything Connected",
                description: "Your project board shouldn't be an island. Agentflox connects code, design, and conversation into a single source of truth.",
                bullets: [
                    "Git Integration: Link every PR and commit to a spec automatically.",
                    "Design Sync: Update task status when Figma designs are approved.",
                    "Meeting Notes: AI agents attend standups and update tickets based on what was said."
                ]
            }}
        />
    );
}
