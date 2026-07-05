"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Bot, Shield, Briefcase, Building2, CheckCircle2, Globe, Code, Database, MessageSquare, Search, Zap, Layers, Server, Brain, Workflow, ScanEye, Share2 } from "lucide-react";
import { Navigation } from "@/app/_components/Navigation";
import { Footer } from "@/app/_components/Footer";
import { CTASection } from "@/app/_components/CTASection";
import AgentBuilderSimulation from "./_components/AgentBuilderSimulation";
import MultiAgentFlow from "./_components/MultiAgentFlow";
import { CognitiveArchitectureTree } from "./_components/CognitiveArchitectureTree";

export default function AgentsPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });

    // Parallax & Opacity transforms
    const yHero = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

    // Marquee variants
    const marqueeVariants = {
        animate: {
            x: [0, -1035],
            transition: {
                x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 25,
                    ease: "linear",
                },
            },
        },
    };

    const roles = [
        "Senior Python Architect", "Marketing Strategist", "Data Scientist", "Legal Compliance Officer",
        "DevOps Engineer", "Customer Success Lead", "Financial Analyst", "UX Researcher",
        "React Specialist", "Cybersecurity Analyst", "Content Writer", "HR Manager"
    ];

    return (
        <div ref={containerRef} className="bg-[#030303] text-white min-h-screen font-sans selection:bg-teal-500/30">
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 pb-20 lg:pt-40 px-4 overflow-hidden">
                {/* Background FX */}
                <PixelBackground />
                <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-transparent to-[#030303] z-0 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[60%] h-full bg-teal-600/5 blur-[120px] pointer-events-none -z-10" />

                {/* Premium Enterprise Bottom Glow (Cyan/Orange) */}
                <div className="absolute bottom-0 left-0 right-0 h-[500px] flex justify-center pointer-events-none z-0 mix-blend-screen">
                    <div className="w-[45%] max-w-[600px] h-full bg-cyan-500/40 blur-[120px] -translate-x-1/4 rounded-full" />
                    <div className="w-[45%] max-w-[600px] h-full bg-orange-500/40 blur-[120px] translate-x-1/4 rounded-full" />
                </div>

                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="relative z-20 flex flex-col items-center"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                                <Bot size={14} />
                                Agentflox Agents 2.0
                            </div>

                            <h1 className="text-6xl md:text-8xl font-medium tracking-tighter mb-8 leading-[1.05] drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70">
                                <ScrambleText text="Sovereign AI" /> <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold drop-shadow-sm">
                                    <ScrambleText text="Workforce" />
                                </span>
                            </h1>

                            {/* Central Glowing Image (Moved to Hero) - Expanded Fit & Edge Fade */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[100vw] max-w-[1100px] h-[100vh] max-h-[1100px] pointer-events-none opacity-80 mix-blend-screen flex items-center justify-center">
                                <div className="absolute inset-0 bg-teal-500/10 blur-[120px] rounded-full" />
                                <img
                                    src="/images/agent_face_wireframe.png"
                                    alt="AI Soul Wireframe"
                                    className="w-full h-full object-contain"
                                    style={{
                                        maskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 40%, transparent 100%)',
                                        WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 40%, transparent 100%)'
                                    }}
                                />
                            </div>

                            <p className="text-lg md:text-xl text-white font-light leading-relaxed mb-12 max-w-2xl mx-auto drop-shadow-md px-4">
                                Deploy autonomous agents that reason, plan, and execute.
                                A complete cognitive labor force available on demand.
                            </p>

                            <div className="flex flex-wrap justify-center gap-5 mt-4">
                                {/* Primary Button with Glow & Hover Lift */}
                                <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02] cursor-pointer">
                                    <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover:bg-opacity-0 transition-all duration-500 z-0"></div>
                                    <div className="absolute inset-0 overflow-hidden rounded-xl z-10 pointer-events-none">
                                        <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out">
                                            <div className="h-full w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-[20deg]" />
                                        </div>
                                    </div>
                                    <span className="relative z-20 flex items-center gap-3 text-lg font-semibold text-white transition-all duration-300">
                                        Deploy Agent
                                        <ArrowRight size={20} className="text-orange-300 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300" />
                                    </span>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-70 transition-all duration-500 z-[-1]"></div>
                                </button>

                                {/* Secondary Glass Button */}
                                <button className="group relative inline-flex items-center justify-center px-8 py-4 font-medium text-white transition-all duration-500 rounded-xl hover:scale-[1.02] overflow-hidden bg-white/5 border border-white/30 hover:border-white/50 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer">
                                    <div className="absolute inset-0 overflow-hidden rounded-xl z-10 pointer-events-none">
                                        <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out delay-100">
                                            <div className="h-full w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[20deg]" />
                                        </div>
                                    </div>
                                    <span className="relative z-20 flex items-center gap-2 text-lg">
                                        View Capabilities
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- PREMIUM GLOWING DIVIDER --- */}
            <div className="relative w-full flex justify-center items-center h-px bg-white/5 z-20">
                <div className="absolute w-[80%] max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80" />
                <div className="absolute w-[40%] max-w-xl h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-90 mix-blend-screen" />
                <div className="absolute w-[60%] max-w-3xl h-[120px] bg-gradient-to-r from-cyan-600/20 to-orange-600/20 blur-[60px] pointer-events-none" />
            </div>

            {/* --- AGENT BUILDER SIMULATION (Prompt Left, Sim Right) --- */}
            <section className="py-24 bg-[#030303] border-b border-white/5 relative">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="flex flex-col lg:flex-row gap-16 items-stretch">

                        <div className="lg:w-1/3 flex flex-col justify-between py-2">
                            <div className="space-y-6">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    Describe. <br />
                                    <span className="text-teal-400">Build.</span> Done.
                                </h2>
                                <p className="text-gray-400 leading-relaxed">
                                    Our natural language engine turns simple instructions into developing complex, role-based agents. No coding required. Simply specify their expertise, the tools they need access to, and their primary objectives, and our cognitive architecture will automatically wire them up to your enterprise stack.
                                </p>
                            </div>

                            <div className="space-y-6 mt-8">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 border-l-4 border-l-teal-500">
                                    <div className="text-xs text-gray-500 font-mono mb-2">INPUT</div>
                                    <p className="text-white italic">"I need a Python expert to refactor my backend API and optimize SQL queries."</p>
                                </div>
                                <ArrowRight className="text-gray-600 rotate-90 lg:rotate-0 mx-auto lg:mx-0" />
                                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                                    <div className="text-xs text-teal-400 font-mono mb-2">RESULT</div>
                                    <p className="text-gray-300 text-sm">Created "Dev-Alpha": <br />Senior Engineer, Python 3.12, PostgreSQL Expert.</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-2/3 w-full">
                            <AgentBuilderSimulation dark />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- INFINITE ROLES TRANSITION (Updated with Multi-Row & Center Image) --- */}
            <section className="relative overflow-hidden bg-[#030303]">
                <div className="relative z-20 flex flex-col items-center text-center max-w-5xl mx-auto mb-16 px-4 pt-16">
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium leading-[1.25] tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">Endless Capacities.</span> If you can define the job, Agentflox can execute it.
                    </h2>
                </div>

                {/* Marquee Rows */}
                <div className="relative z-20 w-full overflow-hidden space-y-6 mask-image-gradient py-12">
                    {/* Row 1 - Left */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-6 px-4"
                            animate={{ x: [0, -2000] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 60 }}
                        >
                            {roles.concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <div key={i} className="relative group flex items-center gap-5 px-3 py-3 pr-8 rounded-full bg-[#0A0A0A]/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-500 cursor-pointer backdrop-blur-md whitespace-nowrap">
                                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 group-hover:border-teal-400/50 shadow-lg group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-500 z-10 shrink-0">
                                        <img src={`https://i.pravatar.cc/100?img=${(i * 7) % 70 + 1}`} alt={role} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 scale-100 group-hover:scale-110 transition-all duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-emerald-400 group-hover:animate-pulse transition-colors" />
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 group-hover:text-emerald-400 transition-colors">Ready to deploy</span>
                                        </div>
                                        <span className="text-xl md:text-2xl font-bold text-gray-500 group-hover:text-white transition-colors tracking-tight">{role}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    {/* Row 2 - Right */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-6 px-4"
                            animate={{ x: [-2000, 0] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 70 }}
                        >
                            {roles.reverse().concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <div key={i} className="relative group flex items-center gap-5 px-3 py-3 pr-8 rounded-full bg-[#0A0A0A]/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-500 cursor-pointer backdrop-blur-md whitespace-nowrap">
                                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 group-hover:border-teal-400/50 shadow-lg group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-500 z-10 shrink-0">
                                        <img src={`https://i.pravatar.cc/100?img=${(i * 13) % 70 + 1}`} alt={role} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 scale-100 group-hover:scale-110 transition-all duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-emerald-400 group-hover:animate-pulse transition-colors" />
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 group-hover:text-emerald-400 transition-colors">Ready to deploy</span>
                                        </div>
                                        <span className="text-xl md:text-2xl font-bold text-gray-500 group-hover:text-white transition-colors tracking-tight">{role}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                    {/* Row 3 - Left */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-6 px-4"
                            animate={{ x: [0, -2000] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 80 }}
                        >
                            {roles.concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <div key={i} className="relative group flex items-center gap-5 px-3 py-3 pr-8 rounded-full bg-[#0A0A0A]/50 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all duration-500 cursor-pointer backdrop-blur-md whitespace-nowrap">
                                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 group-hover:border-teal-400/50 shadow-lg group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-500 z-10 shrink-0">
                                        <img src={`https://i.pravatar.cc/100?img=${(i * 17) % 70 + 1}`} alt={role} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 scale-100 group-hover:scale-110 transition-all duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-emerald-400 group-hover:animate-pulse transition-colors" />
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 group-hover:text-emerald-400 transition-colors">Ready to deploy</span>
                                        </div>
                                        <span className="text-xl md:text-2xl font-bold text-gray-500 group-hover:text-white transition-colors tracking-tight">{role}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- AGENT CAPACITIES (Interactive) --- */}
            <CapabilitiesSection />

            {/* --- AGENTS FOR EVERYTHING (Redesigned Bento) --- */}
            <section className="pb-24 bg-[#030303] relative px-4 border-y border-white/5">
                <div className="container mx-auto max-w-7xl">

                    {/* First Row: Split Layout (Small Left, Large Right) */}
                    <div className="grid lg:grid-cols-3 gap-8 mb-8">
                        {/* Small Left: Introduction */}
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-teal-400 mb-6 w-max">
                                <Briefcase size={12} />
                                Proprietary Technology
                            </div>
                            <h2 className="text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold mb-6 leading-tight">Agents for <br />Every Skillset</h2>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Our platform offers specialized agents tailored to every skill set. From complex coding to strategic sales, deploy the exact expertise you need instantly.
                            </p>
                        </div>

                        {/* Large Right: Feature Card (Premium Search Theme) */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-[#0D0D0D] to-[#050505] rounded-[2rem] p-[1px] relative overflow-hidden group hover:shadow-[0_0_40px_rgba(20,184,166,0.15)] transition-all duration-700 min-h-[300px]">
                            {/* Inner gradient border */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem]" />
                            <div className="relative h-full bg-[#0A0A0A] rounded-[2rem] p-10 overflow-hidden flex flex-col justify-center">
                                {/* Ambient Glows */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full group-hover:bg-teal-500/20 transition-colors duration-700 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-colors duration-700 pointer-events-none" />

                                <div className="grid md:grid-cols-2 gap-12 items-center h-full relative z-10">
                                    <div className="flex flex-col justify-center">
                                        <div className="w-14 h-14 bg-gradient-to-br from-teal-500/20 to-teal-900/20 border border-teal-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(20,184,166,0.15)] group-hover:scale-110 transition-transform duration-500">
                                            <Search className="text-teal-400" size={24} />
                                        </div>
                                        <h3 className="text-3xl md:text-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold mb-4 tracking-tight">Enterprise Connected Search</h3>
                                        <p className="text-gray-400 text-lg leading-relaxed">
                                            Real-time retrieval from 50+ Apps. Fine-tuned embeddings provide infinite context for your agents.
                                        </p>
                                    </div>

                                    <div className="relative h-full flex flex-col justify-center min-h-[220px]">
                                        {/* Backlight for glass list */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-teal-500/10 blur-[60px] rounded-full pointer-events-none" />

                                        <div className="relative z-10 space-y-3 w-full">
                                            {[
                                                { name: "Connected to Notion", color: "bg-emerald-400", glow: "shadow-[0_0_15px_rgba(52,211,153,0.6)]" },
                                                { name: "Connected to Jira", color: "bg-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.6)]" },
                                                { name: "Connected to HubSpot", color: "bg-orange-400", glow: "shadow-[0_0_15px_rgba(251,146,60,0.6)]" }
                                            ].map((item, i) => (
                                                <div key={i} className="group/item flex items-center gap-4 text-sm text-gray-300 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 p-3 px-4 rounded-2xl backdrop-blur-xl transition-all duration-300 transform hover:translate-x-2 hover:shadow-2xl cursor-default">
                                                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/10 shrink-0">
                                                        <div className={`w-2 h-2 rounded-full ${item.color} ${item.glow}`} />
                                                    </div>
                                                    <span className="font-medium tracking-wide">{item.name}</span>
                                                    <div className="ml-auto text-gray-600 group-hover/item:text-white transition-colors duration-300">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Scanning Line overlay */}
                                        <motion.div
                                            animate={{ y: ["-20%", "250%", "-20%"] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                            className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-transparent via-teal-500/20 to-transparent border-y border-teal-500/30 opacity-40 rounded-xl pointer-events-none z-20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Row: 3-per-row Agent Type Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "PM Agents", desc: "Strategy & Planning", img: "/images/pm-agent.png" },
                            { title: "Sales Agents", desc: "Outreach & Closing", img: "/images/sales-agent.png" },
                            { title: "Coding Agents", desc: "Full Stack Development", img: "/images/coding-agent.png" },
                            { title: "Marketing Agents", desc: "Content & Campaigns", img: "/images/marketing-agent.png" },
                            { title: "Design Agents", desc: "UI/UX & Graphics", img: "/images/design-agent.png" },
                            { title: "Customized Agents", desc: "Build Your Own", img: "/images/customized-agent.png" }
                        ].map((agent, i) => (
                            <div key={i} className="bg-[#0A0A0A] rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all h-[280px]">
                                {/* Background Image/Icon */}
                                <div className="absolute inset-0 flex items-center justify-center p-8 pb-20 opacity-60 group-hover:opacity-80 transition-opacity">
                                    <img
                                        src={agent.img}
                                        alt={agent.title}
                                        className="w-full h-full object-contain mix-blend-screen scale-110 group-hover:scale-125 transition-transform duration-700"
                                    />
                                </div>

                                {/* Gradient Scrim for Text Visibility */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

                                {/* Text Content - Pinned Bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">{agent.title}</h3>
                                        <ArrowRight size={18} className="text-teal-400 -rotate-45 group-hover:text-white group-hover:rotate-0 transition-all duration-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{agent.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- AGENTIC TECHNOLOGY (New Bento Section) --- */}
            <section className="pb-24 bg-[#030303] relative px-4">
                <div className="container mx-auto max-w-7xl">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-4xl mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-8 w-max">
                            <Code size={12} />
                            Platform Architecture
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium leading-[1.25] tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">Agentic Technology.</span> An operating system designed for autonomous labor. Measure, monitor, and scale your digital workforce.
                        </h2>
                    </motion.div>

                    {/* Bento Grid (Merged) */}
                    <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(300px,auto)] border border-white/5 rounded-3xl bg-[#0A0A0A] overflow-hidden">

                        {/* Row 1, Col 1: Agent Analytics */}
                        <div className="md:col-span-4 p-8 flex flex-col justify-between border-b border-white/5 md:border-r">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Agent Analytics</h3>
                                <p className="text-gray-400 text-sm">Measure productivity across teams, monitor trends, and spot your top performers.</p>
                            </div>
                            <button className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold w-max hover:bg-gray-200 transition-colors">
                                Get started
                            </button>
                        </div>

                        {/* Row 1, Col 2: Workspace AI Percentile */}
                        <div className="md:col-span-4 p-8 flex flex-col items-center justify-center relative overflow-hidden border-b border-white/5 md:border-r">
                            <div className="text-[10px] uppercase font-mono text-gray-500 mb-2">Workspace AI Percentile</div>
                            <div className="text-7xl font-bold text-white mb-4 flex items-start">
                                40%
                                <ArrowRight className="text-emerald-500 rotate-[-45deg] mt-2 ml-2" size={24} />
                            </div>
                            <div className="flex gap-1 items-end h-8">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className={`w-1.5 rounded-t ${i < 6 ? 'bg-white h-full' : 'bg-white/10 h-1/2'}`} />
                                ))}
                            </div>
                            <div className="mt-6 text-[10px] text-emerald-400 font-mono text-center">
                                YOU ARE CRUSHING IT!<br />
                                YOU AND YOUR AGENTS LEAD IN AI ADOPTION.
                            </div>
                        </div>

                        {/* Row 1, Col 3: Top Performers */}
                        <div className="md:col-span-4 p-8 border-b border-white/5">
                            <div className="text-[10px] uppercase font-mono text-gray-500 mb-6">Top Performers</div>
                            <div className="space-y-4">
                                {[
                                    { role: "Program Manager", score: 125, color: "bg-orange-500" },
                                    { role: "Content Creator", score: 98, color: "bg-blue-500" },
                                    { role: "QA Tester", score: 87, color: "bg-pink-500" },
                                    { role: "Marketing Strategist", score: 71, color: "bg-purple-500" }
                                ].map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full ${p.color} flex items-center justify-center text-[8px] font-bold text-white`}>
                                                {p.role[0]}
                                            </div>
                                            <span className="text-gray-300 font-bold">{p.role}</span>
                                        </div>
                                        <span className="font-mono text-gray-500">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Row 2, Col 1: Ambient Awareness */}
                        <div className="md:col-span-4 p-8 flex flex-col justify-center border-b border-white/5 md:border-r">
                            <h3 className="text-2xl font-bold text-white mb-4">Ambient Awareness</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Automatically jumps in when helpful without being triggered manually — giving you automatic AI value without relying on humans to adopt it.
                            </p>
                        </div>

                        {/* Row 2, Col 2 (Span 8): Usage Chart with 21.3k */}
                        <div className="md:col-span-8 p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px] border-b border-white/5">
                            <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
                                <svg className="w-full h-full" preserveAspectRatio="none">
                                    <path d="M0,150 Q100,100 200,140 T400,120 T600,80 T800,160 L800,300 L0,300 Z" fill="url(#grad1)" />
                                    <defs>
                                        <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: 'rgb(99,102,241)', stopOpacity: 0.5 }} />
                                            <stop offset="100%" style={{ stopColor: 'rgb(99,102,241)', stopOpacity: 0 }} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>

                            <div className="relative z-10">
                                <div className="text-7xl font-bold text-white mb-2">21.3K</div>
                                <div className="text-xs font-mono uppercase text-gray-400 flex items-center gap-2">
                                    Questions Answered <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse ml-2" /> 33 AGENTS ONLINE
                                </div>
                            </div>

                            <div className="relative z-10 grid grid-cols-1 gap-4 mt-8">
                                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                    <span className="text-gray-500">Next Milestone</span>
                                    <span className="text-white font-mono">25,000</span>
                                </div>
                                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                                    <span className="text-gray-500">Milestone Complete</span>
                                    <span className="text-gray-600 font-mono">20,000</span>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Live Intelligence */}
                        <div className="md:col-span-12 relative overflow-hidden h-[400px] border-b border-white/5 bg-[#050505] group">
                            {/* Inner gradient mask */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#000_100%)] z-20 pointer-events-none" />

                            <div className="grid md:grid-cols-3 h-full relative z-30 pointer-events-none">
                                <div className="p-10 flex flex-col justify-center border-r border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md shadow-[20px_0_40px_rgba(0,0,0,0.5)] pointer-events-auto">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                        <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-wider">Live Intelligence</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Actively monitors all context</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Automatically captures and updates knowledge bases for people, teams, projects, decisions, and more.
                                    </p>
                                </div>
                                <div className="md:col-span-2 relative flex items-center justify-center pointer-events-auto overflow-hidden">

                                    {/* Radar Base Grid */}
                                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />

                                    {/* Concentric Circles */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-emerald-500/10 rounded-full" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-emerald-500/20 rounded-full" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-emerald-500/30 rounded-full shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-dashed border-emerald-500/40 rounded-full" />

                                    {/* Crosshairs */}
                                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500/20" />
                                    <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500/20" />

                                    {/* Center Node */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,1)] z-10">
                                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                                    </div>

                                    {/* Conic Sweep */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full overflow-hidden">
                                        <div
                                            className="w-full h-full animate-[spin_4s_linear_infinite] rounded-full"
                                            style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(16, 185, 129, 0.15) 95%, rgba(16, 185, 129, 0.6) 100%)' }}
                                        />
                                    </div>

                                    {/* Detected Elements */}
                                    <motion.div
                                        animate={{ y: [-5, 5, -5] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute top-[25%] right-[20%] flex items-center gap-3 cursor-default hover:scale-105 transition-transform"
                                    >
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,1)]" />
                                            <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-60" />
                                        </div>
                                        <div className="bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30 text-[11px] text-emerald-50 font-medium shadow-[0_0_20px_rgba(16,185,129,0.2)] whitespace-nowrap">
                                            Competitor Pricing
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        animate={{ y: [5, -5, 5] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute bottom-[25%] left-[15%] flex items-center gap-3 cursor-default hover:scale-105 transition-transform"
                                    >
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 bg-teal-400 rounded-full shadow-[0_0_12px_rgba(45,212,191,1)]" />
                                            <div className="absolute inset-0 w-2.5 h-2.5 bg-teal-400 rounded-full animate-ping opacity-60" />
                                        </div>
                                        <div className="bg-[#0A0A0A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-teal-500/30 text-[11px] text-teal-50 font-medium shadow-[0_0_20px_rgba(45,212,191,0.2)] whitespace-nowrap">
                                            Brand Guidelines
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        animate={{ y: [-3, 3, -3] }}
                                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        className="absolute top-[35%] left-[45%] flex items-center gap-3 cursor-default hover:scale-105 transition-transform"
                                    >
                                        <div className="relative">
                                            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,1)]" />
                                        </div>
                                        <div className="bg-[#0A0A0A]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-cyan-500/30 text-[10px] text-cyan-50 font-medium shadow-[0_0_20px_rgba(34,211,238,0.2)] whitespace-nowrap">
                                            Q3 Data
                                        </div>
                                    </motion.div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <CTASection />
            <Footer />
        </div >
    );
}

function CapabilitiesSection() {
    const [activeId, setActiveId] = React.useState("01");

    const capabilities = [
        {
            id: "01",
            title: "Memory",
            desc: "A well-rounded agent remembers. From episodic events to personalized user preferences, unified short and long-term memory ensures every interaction has continuity.",
            img: "/images/agent-memory.png"
        },
        {
            id: "02",
            title: "Knowledge",
            desc: "True intelligence requires depth. Instant access to vast, indexed enterprise knowledge bases empowers agents to ground their reasoning in factual, up-to-date context.",
            img: "/images/agent-knowledge.png"
        },
        {
            id: "03",
            title: "Collaboration",
            desc: "Complex problems require teamwork. Seamless multi-agent communication allows specialized AI roles to collaborate and orchestrate multi-step workflows together.",
            img: "/images/collaboration_wireframe-Photoroom.png"
        },
        {
            id: "04",
            title: "Execution",
            desc: "Ideas need action. Robust autonomous execution ensures your agents don't just plan—they reliably act, featuring built-in error handling and success verification.",
            img: "/images/execution_wireframe-Photoroom.png"
        },
        {
            id: "05",
            title: "Autonomy",
            desc: "The pinnacle of capability is independence. Self-directed reasoning allows agents to interpret high-level goals and pursue them without requiring constant human oversight.",
            img: "/images/agent-autonomy.png"
        },
        {
            id: "06",
            title: "Aware",
            desc: "Context drives relevance. Deep situational awareness ensures your agents process the subtle nuances of time, environment, and specific user intent before taking action.",
            img: "/images/aware_sphere_clean-Photoroom.png"
        },
        {
            id: "07",
            title: "Feedback",
            desc: "A complete agent never stops learning. Continuous feedback loops allow your workforce to adapt, self-correct, and dynamically improve based on real-world outcomes.",
            img: "/images/feedback_wireframe-Photoroom.png"
        }
    ];

    return (
        <section className="pt-16 pb-24 bg-[#030303] relative border-t border-white/5">
            <div className="container mx-auto max-w-7xl px-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium leading-[1.25] tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">The multifaceted agent.</span> True autonomy requires a complete set of cognitive skills. Agentflox equips your AI workforce with deep memory, contextual awareness, and flawless execution to seamlessly manage your most complex workflows.
                    </h2>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-16 relative">
                    {/* Left: Interactive List */}
                    <div className="space-y-4">
                        {capabilities.map((cap) => (
                            <div
                                key={cap.id}
                                onClick={() => setActiveId(cap.id)}
                                className={`group cursor-pointer border-t border-white/5 pt-6 pb-2 transition-all duration-300 ${activeId === cap.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                            >
                                <h3 className={`text-2xl font-bold mb-2 flex items-center gap-4 transition-colors ${activeId === cap.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                    <span className={`font-mono text-lg transition-colors ${activeId === cap.id ? 'text-teal-400' : 'text-gray-700 group-hover:text-teal-400/50'}`}>{cap.id}</span>
                                    {cap.title}
                                </h3>
                                <div
                                    className={`overflow-hidden transition-all duration-500 ease-in-out ${activeId === cap.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <p className="text-gray-400 pl-10 max-w-md pt-2">
                                        {cap.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Visual (Controlled by List) */}
                    <div className="relative w-full h-full hidden lg:block">
                        <div className="sticky top-32 h-[600px] flex items-center justify-center w-full">
                            <div className="relative w-full h-full flex items-center justify-center bg-transparent">
                                {capabilities.map((cap) => (
                                    <motion.img
                                        key={cap.id}
                                        src={cap.img}
                                        alt={cap.title}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{
                                            opacity: activeId === cap.id ? 0.9 : 0,
                                            scale: activeId === cap.id ? 1 : 0.95,
                                            mixBlendMode: "screen"
                                        }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute w-full h-full object-contain"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ScrambleText({ text, className }: { text: string; className?: string }) {
    const [displayText, setDisplayText] = React.useState(text);
    const mounted = React.useRef(false);

    React.useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;
        // Small delay to avoid running on initial SSR-matched paint
        const startDelay = setTimeout(() => {
            let iterations = 0;
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
            const interval = setInterval(() => {
                setDisplayText(
                    text
                        .split("")
                        .map((char, index) => {
                            if (index < iterations / 3) return char;
                            if (char === " ") return " ";
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join("")
                );
                iterations++;
                if (iterations > text.length * 3) clearInterval(interval);
            }, 40);
            return () => clearInterval(interval);
        }, 200);
        return () => clearTimeout(startDelay);
    }, [text]);

    return <span className={className}>{displayText}</span>;
}

// Seeded pseudo-random to generate stable positions server+client side
function seededRandom(seed: number) {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
}

const PIXEL_DATA = (() => {
    const r = (n: number) => parseFloat(n.toFixed(4));
    const teal = Array.from({ length: 200 }, (_, i) => ({
        id: `p1-${i}`,
        left: r(seededRandom(i * 3) * 100),
        top: r(seededRandom(i * 3 + 1) * 100),
        duration: r(seededRandom(i * 3 + 2) * 2 + 1),
        delay: r(seededRandom(i * 7) * 5),
    }));
    const purple = Array.from({ length: 150 }, (_, i) => ({
        id: `p2-${i}`,
        left: r(seededRandom(i * 5) * 100),
        top: r(seededRandom(i * 5 + 1) * 100),
        duration: r(seededRandom(i * 5 + 2) * 3 + 1),
        delay: r(seededRandom(i * 11) * 5),
    }));
    return { teal, purple };
})();

function PixelBackground() {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    if (!mounted) return null;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30 mix-blend-screen" style={{ maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)' }}>
            {PIXEL_DATA.teal.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
                    className="absolute w-1 h-1 bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                    style={{ left: `${p.left}%`, top: `${p.top}%` }}
                />
            ))}
            {PIXEL_DATA.purple.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
                    className="absolute w-1.5 h-1.5 bg-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                    style={{ left: `${p.left}%`, top: `${p.top}%` }}
                />
            ))}
        </div>
    );
}
