"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Bot, Sparkles, Brain, Zap, Globe, Cpu } from "lucide-react";

export default function AgentfloxAIPage() {
    return (
        <FeaturePageLayout
            badge="Agentflox AI Platform"
            title="The Future of Work is Autonomous"
            description="Experience the world's most advanced autonomous agent platform. Beyond simple chatbots—build digital workers that think, plan, and execute."
            heroVisual={
                <div className="w-full h-full relative overflow-hidden rounded-xl bg-[#000]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#050505] to-[#000]" />
                    {/* Neural Network Visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-full h-full">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="absolute w-1 h-1 bg-indigo-500 rounded-full animate-pulse"
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                        opacity: Math.random()
                                    }}
                                />
                            ))}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                                <Bot size={64} className="text-white relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Cognitive Engine",
                    description: "Powered by our proprietary Chain-of-Thought reasoning models. Agents don't just guess next tokens; they solve problems.",
                    icon: Brain
                },
                {
                    title: "Universal Connectivity",
                    description: "Native integrations with 100+ SaaS tools. Give your agents eyes and hands in Slack, Jira, GitHub, and Salesforce.",
                    icon: Globe
                },
                {
                    title: "Instant Scaling",
                    description: "Deploy one agent or ten thousand. Our serverless infrastructure handles the compute, you focus on the logic.",
                    icon: Cpu
                }
            ]}
            stats={[
                { label: "Reasoning", value: "SOTA", subtext: "Performance Benchmarks" },
                { label: "Latency", value: "<100ms", subtext: "Global Edge Network" },
                { label: "Uptime", value: "99.99%", subtext: "Enterprise SLA" }
            ]}
            deepDive={{
                title: "Why Autonomous Agents?",
                description: "Traditional automation is brittle. If a button moves, the script breaks. Agentflox Agents use vision and reasoning to adapt to changes automatically.",
                bullets: [
                    "Self-Healing: Agents retry failed actions with new strategies.",
                    "Multimedia: Process text, images, and code simultaneously.",
                    "Collaborative: Agents can talk to each other to solve complex tasks."
                ]
            }}
        />
    );
}
