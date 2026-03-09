"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Terminal, Code2, Webhook, Box, Smartphone, Key, Cpu, Network } from "lucide-react";

export default function APIPage() {
    return (
        <FeaturePageLayout
            badge="Developer Platform"
            title="Programmable Intelligence for Engineers"
            description="Built by developers, for developers. Control every aspect of the agent lifecycle programmatically via our typed SDK and low-latency API."
            heroVisual={
                <div className="w-full h-full p-6 font-mono text-[10px] leading-relaxed text-gray-400 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 bg-white/5 border-l border-b border-white/10 rounded-bl-xl text-indigo-400">typescript</div>
                    <div><span className="text-purple-400">import</span> {"{ Agent }"} <span className="text-purple-400">from</span> <span className="text-green-400">'@agentflox/sdk'</span>;</div>
                    <div className="mt-4"><span className="text-blue-400">const</span> agent = <span className="text-blue-400">new</span> Agent({"{ "}<br />&nbsp;&nbsp;model: <span className="text-green-400">'gpt-4-turbo'</span>,<br />&nbsp;&nbsp;tools: [webSearch, database]<br />{"}"});</div>
                    <div className="mt-4"><span className="text-gray-500">// Stream response in real-time</span></div>
                    <div><span className="text-blue-400">await</span> agent.run(<span className="text-green-400">'Analyze Q3 data'</span>);</div>

                    {/* Glowing cursor */}
                    <div className="inline-block w-2 h-4 bg-indigo-500 animate-pulse align-middle ml-1" />
                </div>
            }
            features={[
                {
                    title: "Type-Safe SDK",
                    description: "Full TypeScript support with auto-generated types for all your agent actions and events. Catch errors at compile time.",
                    icon: Code2
                },
                {
                    title: "Real-Time Streaming",
                    description: "Stream agent thoughts, tool inputs, and partial responses via Server-Sent Events (SSE) for zero-latency UIs.",
                    icon: Network
                },
                {
                    title: "Granular Webhooks",
                    description: "Subscribe to lifecycle events: onStart, onThought, onAction, onComplete. Build custom dashboards and logs.",
                    icon: Webhook
                }
            ]}
            stats={[
                { label: "Latency", value: "80ms", subtext: "P99 Response Time" },
                { label: "Throughput", value: "50M", subtext: "Daily Requests" },
                { label: "Uptime", value: "99.99%", subtext: "Global CDN" },
                { label: "SDKs", value: "5", subtext: "JS, Py, Go, Rust" }
            ]}
            deepDive={{
                title: "Built for Scale",
                description: "Whether you're running one agent or one million, our infrastructure scales with you. No cold starts, no rate limits.",
                bullets: [
                    "Edge Caching: Agent configurations are cached at the edge for instant startup.",
                    "Horizontal Scaling: Serverless architecture handles massive concurrent swarms.",
                    "Observability: Built-in OpenTelemetry tracing for debugging complex behaviors."
                ]
            }}
        />
    );
}
