"use client";

import React from "react";
import { Clock, Coins, Network, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const BenefitCard = ({ icon: Icon, title, description, badge, delay }: any) => (
    <div
        className="group relative p-8 h-full rounded-3xl bg-[#080808] border border-white/5 hover:border-indigo-500/30 transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col justify-between"
    >
        {/* Subtle Gradient Hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div>
            {/* Header with Icon and Badge */}
            <div className="flex items-start justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    <Icon size={28} className="text-gray-400 group-hover:text-indigo-400 transition-colors" />
                </div>
                {badge && (
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-wider text-gray-400 group-hover:text-white group-hover:border-indigo-500/30 transition-colors">
                        {badge}
                    </span>
                )}
            </div>

            {/* Content */}
            <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-indigo-100 transition-colors tracking-tight">
                {title}
            </h3>
            <p className="text-gray-400 font-light leading-relaxed group-hover:text-gray-300 transition-colors pr-4">
                {description}
            </p>
        </div>

        {/* Bottom Graphic / Action (Abstract) */}
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-gray-500 group-hover:text-indigo-400 transition-colors">
            <span>Explore capabilities</span>
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </div>
    </div>
);

export const BenefitSection = () => {
    const benefits = [
        {
            icon: Clock,
            badge: "Velocity",
            title: "Accelerated Time-to-Market",
            description: "Launch products 10x faster. Autonomous agents handle repetitive coding, testing, and deployment cycles 24/7, removing human bottlenecks from the critical path."
        },
        {
            icon: Coins,
            badge: "Efficiency",
            title: "Drastically Reduced Costs",
            description: "Cut operational overhead by up to 60%. Replace expensive, fragmented toolchains with a single unified operating system that optimizes resource allocation automatically."
        },
        {
            icon: Network,
            badge: "Scale",
            title: "Infinite Scalability",
            description: "Spin up thousands of agent workers instantly to handle demand spikes. Your workforce grows elastically with your user base, ensuring zero downtime or performance degradation."
        }
    ];

    return (
        <section className="relative w-full py-32 bg-[#030303] overflow-hidden border-b border-white/5">
            {/* Background Effects */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-900/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">

                <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                            Unlock Exponential <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                                Business Growth.
                            </span>
                        </h2>
                    </div>
                    <div className="max-w-xl">
                        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed border-l-2 border-white/10 pl-6">
                            Stop trading time for money. Agentflox's agentic architecture decouples your output from headcount, enabling non-linear scaling for the modern enterprise.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {benefits.map((benefit, idx) => (
                        <BenefitCard key={idx} {...benefit} delay={idx} />
                    ))}
                </div>

            </div>
        </section>
    );
};
