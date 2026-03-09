"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { LayoutGrid, ListTodo, KanbanSquare, Calendar, PieChart, Users, ArrowUpRight, BarChart } from "lucide-react";

export default function ProjectManagementPage() {
    return (
        <FeaturePageLayout
            badge="Project Management"
            title="Automate the Process, Focus on the Product"
            description="Let AI agents handle the busywork of tickets, status updates, and scheduling. Reclaim your time for strategy and team leadership."
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
                    title: "Auto-Triage & Assign",
                    description: "Agents analyze incoming tickets/issues, tag them, set priority, and assign to the right developer instantly.",
                    icon: ListTodo
                },
                {
                    title: "Smart Status Reports",
                    description: "AI summarizes work across all repos and tools to generate accurate, real-time daily standups and weekly reports.",
                    icon: BarChart
                },
                {
                    title: "Predictive Timelines",
                    description: "Forecast delivery dates based on historical velocity and complexity analysis, not just guesses.",
                    icon: Calendar
                }
            ]}
            stats={[
                { label: "Admin Time Saved", value: "15h/wk", subtext: "Per Manager" },
                { label: "Report Accuracy", value: "100%", subtext: "Data-driven" },
                { label: "Task Velocity", value: "+40%", subtext: "Throughput" }
            ]}
            deepDive={{
                title: "The Self-Driving Project Board",
                description: "Agentflox listens to GitHub, Slack, and Figma to keep your project board in sync with reality. No more 'stale ticket' meetings.",
                bullets: [
                    "Auto-Move: PR Merge -> Ticket moves to 'Done'.",
                    "Stalled Detection: AI flags tasks that haven't moved in 3 days.",
                    "Contextual Search: Ask 'Who is working on the checkout flow?' and get an instant answer."
                ]
            }}
        />
    );
}
