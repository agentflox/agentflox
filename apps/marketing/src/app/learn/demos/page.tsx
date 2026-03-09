"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Play, Code, Terminal, Database, Globe, Cpu } from "lucide-react";

export default function DemosPage() {
    return (
        <FeaturePageLayout
            badge="Interactive Demos"
            title="See Agentflox in Action"
            description="Explore real-world use cases. Run live agents in your browser and see how they reason, plan, and execute tasks."
            heroVisual={
                <div className="w-full h-full p-4 grid grid-cols-2 gap-4 content-center">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2"><Globe size={20} /></div>
                        <h3 className="font-bold text-white mb-1">Web Scraper Agent</h3>
                        <p className="text-xs text-gray-400">Extract data from any website into JSON.</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 font-bold group-hover:translate-x-1 transition-transform">
                            Run Demo <Play size={10} fill="currentColor" />
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer group relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 mb-2"><Database size={20} /></div>
                        <h3 className="font-bold text-white mb-1">SQL Writer Agent</h3>
                        <p className="text-xs text-gray-400">Natural language to optimized SQL queries.</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-400 font-bold group-hover:translate-x-1 transition-transform">
                            Run Demo <Play size={10} fill="currentColor" />
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Live Sandbox",
                    description: "No signup required. Test our agents with your own prompts and data directly in the browser.",
                    icon: Terminal
                },
                {
                    title: "Scenario Library",
                    description: "Pre-configured environments for common use cases like Customer Support, Data Analysis, and Code Generation.",
                    icon: Code
                },
                {
                    title: "Performance Metrics",
                    description: "See the token usage, latency, and reasoning steps for every action the agent takes.",
                    icon: Cpu
                }
            ]}
            stats={[
                { label: "Active Demos", value: "12", subtext: "Ready to run" },
                { label: "Daily Runs", value: "5k+", subtext: "By users" },
                { label: "Avg Latency", value: "800ms", subtext: "Time to first token" }
            ]}
        />
    );
}
