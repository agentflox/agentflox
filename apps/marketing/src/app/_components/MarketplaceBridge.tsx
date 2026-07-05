"use client";

import React from "react";
import { ArrowDownRight, Globe, CheckCircle2 } from "lucide-react";
import { motion, Variants } from "framer-motion";

// Framer Motion Variants
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

export const MarketplaceBridge = () => {
    return (
        <section className="relative w-full pt-12 lg:pt-24 pb-12 lg:pb-24 bg-[#020202] overflow-hidden border-t border-white/[0.05]">
            {/* Enterprise Grade Ambient Backgrounds */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute -top-[20%] left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
            <div className="absolute -bottom-[20%] right-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

            <div className="container mx-auto px-6 lg:px-12 max-w-[1400px] relative z-10">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    {/* Conceptual Bridge Header */}
                    <motion.div variants={itemVariants} className="max-w-4xl mb-10 lg:mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md mb-8 shadow-2xl">
                            <Globe size={14} className="text-cyan-400" />
                            <span className="text-xs font-semibold text-gray-300 tracking-widest uppercase">
                                The Agentflox Marketplace
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight font-medium bg-clip-text text-transparent bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">
                                Supercharge your workflow. Share what you build.
                            </span>{" "}
                            Connect to a global network of AI agents and expert talent.
                        </h2>
                    </motion.div>

                    {/* Premium Asymmetrical Bento Grid */}
                    <div className="flex flex-col gap-6 mb-10 lg:mb-20">

                        {/* Top: Wide feature card — text on the left, image bleeding on the right of the parent container */}
                        <motion.div
                            variants={itemVariants}
                            className="group relative w-full min-h-[440px] rounded-[32px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden transition-all duration-700 hover:border-cyan-500/30 hover:bg-white/[0.04]"
                        >
                            {/* Spotlight Hover Gradient */}
                            <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[32px]" />

                            {/* Ambient glow sitting behind the bleeding image */}
                            <div className="absolute right-0 top-0 h-full w-full lg:w-[55%] pointer-events-none overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 rounded-full bg-cyan-500/10 blur-[100px]" />
                                </div>
                            </div>

                            {/* Text content — constrained to the left portion so the image can bleed on the right */}
                            <div className="relative z-10 flex flex-col justify-between h-full w-full lg:w-[55%] p-10">
                                <div>
                                    <h3 className="text-2xl lg:text-3xl font-semibold text-white mb-4 tracking-tight">
                                        One Marketplace for Everything
                                    </h3>
                                    <p className="text-base text-[#8A8F98] mb-8 leading-relaxed max-w-xl">
                                        Share what you build and discover what you need. From AI agents and workflows to expert talent and pre-built templates — everything is available on the distributed marketplace.
                                    </p>
                                </div>

                                <ul className="border-t border-white/10 flex flex-col justify-center">
                                    {[
                                        {
                                            text: "Sell & list anything you've built — agents, tools, templates, or entire workflows",
                                            icon: (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 mt-0.5 shrink-0">
                                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )
                                        },
                                        {
                                            text: "Discover paid tasks to start earning, or join ambitious teams to collaborate",
                                            icon: (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 mt-0.5 shrink-0">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                                    <path d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )
                                        },
                                        {
                                            text: "Hire expert talent and specialized teams to accelerate your projects",
                                            icon: (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 mt-0.5 shrink-0">
                                                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )
                                        }
                                    ].map((item, i, arr) => (
                                        <li
                                            key={i}
                                            className={`flex items-center gap-3 text-sm text-gray-300 py-4 min-h-[52px] ${i < arr.length - 1 ? "border-b border-white/10" : ""}`}
                                        >
                                            {item.icon}
                                            <span className="leading-relaxed">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Image — positioned on the right side of the parent (card) container, bleeding past the text column */}
                            <motion.img
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                                viewport={{ once: true }}
                                src="./images/marketplace-bridge-vertical-Photoroom.png"
                                alt="Cubics → OS Connector → Stack Cards flow"
                                className="hidden lg:block absolute right-0 bottom-0 h-full max-h-[460px] w-auto object-contain object-bottom drop-shadow-[0_0_40px_rgba(6,182,212,0.25)] select-none z-10 mix-blend-screen pr-10"
                                draggable={false}
                            />
                        </motion.div>

                        {/* Bottom: one connected card, split by a center divider, each half its own UI illustration + title + subtitle */}
                        <motion.div
                            variants={itemVariants}
                            className="relative w-full rounded-[32px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2">

                                {/* Left half — Deploy Pre-Built Intelligence */}
                                <div className="group/left relative flex flex-col items-center gap-6 p-10 border-b md:border-b-0 md:border-r border-white/[0.08] transition-colors duration-700 hover:bg-white/[0.02]">
                                    <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/15 via-transparent to-transparent opacity-0 group-hover/left:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                    {/* UI illustration: mock marketplace asset card */}
                                    <div className="relative z-10 w-full max-w-[280px] h-[220px] rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col justify-between group/card">
                                        {/* Top decorative glow */}
                                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/20 blur-[40px] rounded-full pointer-events-none transition-opacity duration-500 group-hover/card:opacity-100 opacity-50" />

                                        <div className="relative flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[1px] shrink-0">
                                                    <div className="w-full h-full bg-[#050505] rounded-xl flex items-center justify-center backdrop-blur-md">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 className="text-[13px] font-semibold text-white leading-tight">Sales Agent Pro</h5>
                                                    <p className="text-[10px] text-cyan-400 mt-1 font-medium">By Agentflox</p>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                4.9
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-gray-400 leading-relaxed mb-4 relative line-clamp-2">
                                            Autonomous sales representative that qualifies leads, handles objections, and schedules meetings 24/7.
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/10 relative">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className={`w-6 h-6 rounded-full border-2 border-[#09090b] bg-gradient-to-br ${i === 1 ? 'from-purple-500 to-indigo-500' : i === 2 ? 'from-emerald-400 to-teal-500' : 'from-orange-400 to-rose-500'} shrink-0`} />
                                                ))}
                                                <div className="w-6 h-6 rounded-full border-2 border-[#09090b] bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                                                    <span className="text-[8px] text-white font-bold">+2k</span>
                                                </div>
                                            </div>
                                            <button className="px-4 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                Install
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative z-10 text-center px-2">
                                        <h4 className="text-lg font-semibold text-white mb-1">Plug & Play Templates</h4>
                                        <p className="text-sm text-[#8A8F98]">Install verified agents and workflows with one click</p>
                                    </div>
                                </div>

                                {/* Right half — Scale with Elite Capital */}
                                <div className="group/right relative flex flex-col items-center gap-6 p-10 transition-colors duration-700 hover:bg-white/[0.02]">
                                    <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/15 via-transparent to-transparent opacity-0 group-hover/right:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                    {/* UI illustration: mock talent profile card */}
                                    <div className="relative z-10 w-full max-w-[280px] h-[220px] rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col justify-between group/card">
                                        {/* Top decorative glow */}
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 blur-[40px] rounded-full pointer-events-none transition-opacity duration-500 group-hover/card:opacity-100 opacity-50" />

                                        <div className="relative flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12 rounded-full p-[1px] shrink-0 bg-gradient-to-br from-indigo-400 to-purple-600">
                                                    <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center overflow-hidden">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#09090b] rounded-full" />
                                                </div>
                                                <div>
                                                    <h5 className="text-[13px] font-semibold text-white leading-tight">Elevate Agency</h5>
                                                    <p className="text-[10px] text-indigo-400 mt-1 font-medium">Top Rated Team</p>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                                                $45/hr
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-gray-400 leading-relaxed mb-4 relative line-clamp-2">
                                            A group of elite full-stack developers and AI specialists ready to scale your next big project.
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/10 relative">
                                            <div className="flex gap-1.5">
                                                {["React", "Node", "AI"].map((skill, i) => (
                                                    <span key={i} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] text-gray-300 font-medium">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                            <button className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white text-[11px] font-bold hover:bg-indigo-400 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                                Hire Now
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative z-10 text-center px-2">
                                        <h4 className="text-lg font-semibold text-white mb-1">On-Demand Talent</h4>
                                        <p className="text-sm text-[#8A8F98]">Hire top-tier experts and teams for your projects</p>
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    </div>

                    {/* Contextual Cue */}
                    <motion.div variants={itemVariants} className="w-full flex flex-col items-center justify-center text-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-pointer group">
                        <span className="text-xs font-semibold uppercase tracking-widest text-gray-300 group-hover:text-white transition-colors">
                            Browse the marketplace
                        </span>
                        <motion.div
                            animate={{ y: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="p-2 rounded-full bg-white/[0.05] border border-white/[0.1] group-hover:border-cyan-500/50 transition-colors"
                        >
                            <ArrowDownRight size={16} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>
    );
};