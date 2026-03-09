"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { BookOpen, Search, Code2, Terminal, Lightbulb, PlayCircle, Layers } from "lucide-react";

export default function DocsPage() {
    return (
        <FeaturePageLayout
            badge="Documentation"
            title="Read the Manual"
            description="Everything you need to build, deploy, and scale with Agentflox. API references, concepts, and best practices."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="w-full h-full bg-[#0d1117] rounded-xl border border-gray-800 p-4 font-mono text-sm overflow-hidden relative">
                        <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
                            <div className="text-gray-400">getting-started.mdx</div>
                        </div>
                        <div className="text-blue-400"># Quick Start</div>
                        <div className="text-gray-400 mt-2">To initialize a new agent swarm:</div>
                        <div className="bg-gray-800/50 p-2 rounded mt-2 text-green-400">
                            $ npx agentflox init my-swarm
                        </div>
                        <div className="text-gray-400 mt-4">This will create a <span className="text-orange-400">agentflox.config.ts</span> file in your root.</div>

                        {/* Search Overlay */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-[#161b22] border border-gray-700 rounded-lg shadow-2xl p-2 flex items-center gap-2">
                            <Search size={16} className="text-gray-500" />
                            <span className="text-gray-400">Search docs...</span>
                            <div className="ml-auto text-xs bg-gray-700 px-1 rounded text-gray-400">⌘K</div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "API Reference",
                    description: "Complete OpenAPI specification for all endpoints. Request/Response examples in curl, Node, and Python.",
                    icon: Terminal
                },
                {
                    title: "SDK Guides",
                    description: "Idiomatic usage patterns for our TypeScript, Python, and Go SDKs. Type definitions and interfaces included.",
                    icon: Code2
                },
                {
                    title: "Architecture Concepts",
                    description: "Deep dives into how the reasoning engine works, memory persistence, and tool routing logic.",
                    icon: Layers
                }
            ]}
            stats={[
                { label: "Updated", value: "Daily", subtext: "Live sync" },
                { label: "Coverage", value: "100%", subtext: "All features" },
                { label: "Examples", value: "500+", subtext: "Copy-paste ready" }
            ]}
        />
    );
}

import { TerminalSquare } from "lucide-react";
