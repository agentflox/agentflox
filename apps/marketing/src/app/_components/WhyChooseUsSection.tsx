"use client";

import React, { useState } from "react";
import { ShieldCheck, Globe2, Cpu, Lock, Server, Zap, CheckCircle2, LayoutGrid, Network } from "lucide-react";
import { motion } from "framer-motion";

const FeatureRow = ({ icon: Icon, title, desc, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`group flex items-start gap-6 p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${active ? 'bg-white/5 border-indigo-500/50' : 'bg-transparent border-transparent hover:bg-white/[0.02]'}`}
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'}`}>
            <Icon size={24} />
        </div>
        <div>
            <h3 className={`text-xl font-semibold mb-2 transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                {title}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                {desc}
            </p>
        </div>
    </div>
);

export const WhyChooseUsSection = () => {
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        {
            icon: ShieldCheck,
            title: "Enterprise-Grade Security",
            desc: "SOC2 Type II compliant infrastructure with end-to-end encryption for all agent interactions and data storage.",
            stats: [
                { label: "Encryption", value: "AES-256" },
                { label: "Compliance", value: "SOC2 Type II" }
            ],
            visual: "security"
        },
        {
            icon: Network, // Changed from Globe2 to Network for better representation of ecosystem/network
            title: "Open Ecosystem",
            desc: "Integrate with 500+ tools. Don't rip and replace—supercharge your existing stack with our universal API adapters.",
            stats: [
                { label: "Integrations", value: "500+" },
                { label: "API Uptime", value: "99.99%" }
            ],
            visual: "ecosystem"
        },
        {
            icon: Cpu,
            title: "Model Agnostic Engine",
            desc: "Future-proof your AI strategy. Switch between GPT-4, Claude 3, and Llama 3 instantly based on task requirements.",
            stats: [
                { label: "Models", value: "Any LLM" },
                { label: "Fine-tuning", value: "Self-Hosted" }
            ],
            visual: "models"
        }
    ];

    return (
        <section className="relative w-full py-32 bg-[#050505] overflow-hidden border-b border-white/5">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">

                <div className="mb-20 text-center max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        Built for the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Future of Enterprise.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg font-light leading-relaxed">
                        We didn't just build another tool. We architected a complete operating system for the autonomous enterprise, prioritizing security, control, and openness.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">

                    {/* Left: Interactive List */}
                    <div className="flex flex-col gap-4">
                        {features.map((feature, idx) => (
                            <FeatureRow
                                key={idx}
                                {...feature}
                                active={activeFeature === idx}
                                onClick={() => setActiveFeature(idx)}
                            />
                        ))}
                    </div>

                    {/* Right: Dynamic Visual */}
                    <div className="relative h-full min-h-[500px] rounded-3xl bg-[#080808] border border-white/10 overflow-hidden shadow-2xl">
                        {/* Abstract Grid BG */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />

                        <div className="relative h-full flex flex-col items-center justify-center p-8">

                            {/* VISUAL: SECURITY */}
                            {activeFeature === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="relative"
                                >
                                    <div className="w-64 h-64 rounded-full border border-indigo-500/30 flex items-center justify-center relative">
                                        <div className="absolute inset-0 border border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                                        <div className="absolute inset-4 border border-indigo-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                                        <ShieldCheck size={64} className="text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

                                        {/* Floating badges */}
                                        <div className="absolute -top-4 bg-[#0A0A0A] border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-xs text-green-400 font-mono">SOC2 Type II</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* VISUAL: ECOSYSTEM */}
                            {activeFeature === 1 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="grid grid-cols-2 gap-4 w-full max-w-sm"
                                >
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded bg-gradient-to-br ${i % 2 === 0 ? 'from-blue-500/20 to-cyan-500/20' : 'from-purple-500/20 to-pink-500/20'} flex items-center justify-center`}>
                                                <Network size={16} className="text-white/60" />
                                            </div>
                                            <div className="h-2 w-12 bg-white/10 rounded" />
                                        </div>
                                    ))}
                                    <div className="col-span-2 flex justify-center mt-4">
                                        <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400 font-mono flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            500+ Connections Active
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* VISUAL: MODELS */}
                            {activeFeature === 2 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col gap-4 w-full max-w-sm"
                                >
                                    {['GPT-4o', 'Claude 3.5 Sonnet', 'Llama 3 70B'].map((model, i) => (
                                        <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${i === 0 ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/10 opacity-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Cpu size={18} className={i === 0 ? 'text-indigo-400' : 'text-gray-500'} />
                                                <span className={`text-sm font-medium ${i === 0 ? 'text-white' : 'text-gray-400'}`}>{model}</span>
                                            </div>
                                            {i === 0 && <CheckCircle2 size={16} className="text-indigo-400" />}
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {/* Stats Footer in Visual */}
                            <div className="absolute bottom-0 inset-x-0 p-6 bg-[#0A0A0A]/80 backdrop-blur-md border-t border-white/10 grid grid-cols-2 gap-8">
                                {features[activeFeature].stats.map((stat, i) => (
                                    <div key={i}>
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{stat.label}</div>
                                        <div className="text-xl font-bold text-white font-mono">{stat.value}</div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
};
