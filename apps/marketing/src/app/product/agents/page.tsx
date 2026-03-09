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
        <div ref={containerRef} className="bg-[#020202] text-white min-h-screen font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 pb-20 lg:pt-40 px-4 overflow-hidden">
                {/* Background FX */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#020202] via-transparent to-[#020202] z-0 pointer-events-none" />
                <div className="absolute top-0 right-0 w-[60%] h-full bg-indigo-600/5 blur-[120px] pointer-events-none -z-10" />

                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="relative z-20 flex flex-col items-center"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <Bot size={14} />
                                Agentflox Agents 2.0
                            </div>

                            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 leading-[1.0] drop-shadow-2xl">
                                Sovereign AI <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-b from-indigo-300 via-white to-purple-400 drop-shadow-sm">
                                    Workforce
                                </span>
                            </h1>

                            {/* Central Glowing Image (Moved to Hero) - Optimized Fit */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full max-w-[800px] h-full max-h-[1000px] pointer-events-none opacity-50 mix-blend-screen flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full" />
                                <img
                                    src="/images/agent_face_wireframe.png"
                                    alt="AI Soul Wireframe"
                                    className="w-full h-full object-contain scale-100 md:scale-125"
                                />
                            </div>

                            <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed mb-12 max-w-2xl mx-auto backdrop-blur-md bg-black/20 p-6 rounded-2xl border border-white/5 shadow-2xl">
                                Deploy autonomous agents that reason, plan, and execute.
                                A complete cognitive labor force available on demand.
                            </p>

                            <div className="flex flex-wrap justify-center gap-6">
                                {/* Primary Button with Glow & Hover Lift */}
                                <button className="relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden group shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_80px_rgba(255,255,255,0.6)] transition-all duration-300 transform hover:-translate-y-1">
                                    <span className="relative z-10 flex items-center gap-2">
                                        Deploy Agent
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-white to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </button>

                                {/* Secondary Glass Button with Gradient Border effect */}
                                <button className="relative px-8 py-4 text-white font-medium rounded-full transition-all duration-300 group hover:bg-white/5">
                                    <div className="absolute inset-0 rounded-full border border-white/20 group-hover:border-indigo-400/50 transition-colors" />
                                    <div className="absolute inset-0 rounded-full bg-white/5 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        View Capabilities
                                        <span className="w-0 overflow-hidden group-hover:w-4 transition-all duration-300 opacity-0 group-hover:opacity-100">→</span>
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- AGENT BUILDER SIMULATION (Prompt Left, Sim Right) --- */}
            <section className="py-24 bg-[#050505] border-y border-white/5 relative">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="flex flex-col lg:flex-row gap-16 items-center">

                        <div className="lg:w-1/3 space-y-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                Describe. <br />
                                <span className="text-indigo-500">Deploy.</span> Done.
                            </h2>
                            <p className="text-gray-400 leading-relaxed">
                                Our natural language engine turns simple instructions into developing complex, role-based agents. No coding required.
                            </p>

                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 border-l-4 border-l-indigo-500">
                                    <div className="text-xs text-gray-500 font-mono mb-2">INPUT</div>
                                    <p className="text-white italic">"I need a Python expert to refactor my backend API and optimize SQL queries."</p>
                                </div>
                                <ArrowRight className="text-gray-600 rotate-90 lg:rotate-0 mx-auto lg:mx-0" />
                                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <div className="text-xs text-indigo-400 font-mono mb-2">RESULT</div>
                                    <p className="text-gray-300 text-sm">Created "Dev-Alpha": <br />Senior Engineer, Python 3.12, PostgreSQL Expert.</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:w-2/3 w-full">
                            <AgentBuilderSimulation />
                        </div>
                    </div>
                </div>
            </section>

            {/* --- INFINITE ROLES TRANSITION (Updated with Multi-Row & Center Image) --- */}
            <section className="relative py-32 overflow-hidden bg-[#020202]">
                <div className="relative z-20 text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Infinite Roles. One Platform.</h2>
                    <p className="text-gray-400">If you can define the job, Agentflox can execute it.</p>
                </div>

                {/* Marquee Rows */}
                <div className="relative z-20 w-full overflow-hidden space-y-8 mask-image-gradient py-12">
                    {/* Row 1 - Left */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-12 px-4"
                            animate={{ x: [0, -2000] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 60 }}
                        >
                            {roles.concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <span key={i} className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 uppercase tracking-tighter whitespace-nowrap">
                                    {role}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                    {/* Row 2 - Right */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-12 px-4"
                            animate={{ x: [-2000, 0] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 70 }}
                        >
                            {roles.reverse().concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <span key={i} className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 uppercase tracking-tighter whitespace-nowrap">
                                    {role}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                    {/* Row 3 - Left */}
                    <div className="flex w-max">
                        <motion.div
                            className="flex gap-12 px-4"
                            animate={{ x: [0, -2000] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 80 }}
                        >
                            {roles.concat(roles).concat(roles).concat(roles).map((role, i) => (
                                <span key={i} className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 uppercase tracking-tighter whitespace-nowrap">
                                    {role}
                                </span>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* --- AGENT CAPACITIES (Interactive) --- */}
            <CapabilitiesSection />

            {/* --- AGENTS FOR EVERYTHING (Redesigned Bento) --- */}
            <section className="py-32 bg-[#050505] relative px-4">
                <div className="container mx-auto max-w-7xl">

                    {/* First Row: Split Layout (Small Left, Large Right) */}
                    <div className="grid lg:grid-cols-3 gap-8 mb-8">
                        {/* Small Left: Introduction */}
                        <div className="lg:col-span-1 flex flex-col justify-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-purple-400 mb-6 w-max">
                                <Briefcase size={12} />
                                Proprietary Technology
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Agents for <br />Everything</h2>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Our platform offers specialized agents for every department. From coding to sales, deploy the expert you need instantly.
                            </p>
                        </div>

                        {/* Large Right: Feature Card (Analyst/Search Theme) */}
                        <div className="lg:col-span-2 bg-[#0A0A0A] rounded-3xl border border-white/5 p-10 relative overflow-hidden group hover:border-indigo-500/30 transition-all flex flex-col justify-between min-h-[300px]">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="grid md:grid-cols-2 gap-8 items-center h-full">
                                <div>
                                    <Search className="text-indigo-400 mb-4" size={32} />
                                    <h3 className="text-3xl font-bold text-white mb-3">Enterprise Connected Search</h3>
                                    <p className="text-gray-400">
                                        Real-time retrieval from 50+ Apps. Fine-tuned embeddings for infinite context.
                                    </p>
                                </div>
                                <div className="bg-black/40 rounded-xl border border-white/5 p-4 h-full flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 grid grid-cols-6 gap-2 p-4 opacity-20">
                                        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-white/20 rounded h-8 w-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />)}
                                    </div>
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 p-2 rounded">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" /> Connected to Notion
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 p-2 rounded">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" /> Connected to Jira
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 p-2 rounded">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full" /> Connected to HubSpot
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Row: 3-per-row Agent Type Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "PM Agents", desc: "Strategy & Planning", img: "/images/feature-pm.png" },
                            { title: "Sales Agents", desc: "Outreach & Closing", img: "/images/feature-business.png" },
                            { title: "Coding Agents", desc: "Full Stack Development", img: "/images/feature-ai.png" },
                            { title: "Marketing Agents", desc: "Content & Campaigns", img: "/images/feature-marketplace.png" },
                            { title: "Design Agents", desc: "UI/UX & Graphics", img: "/images/agent_face_wireframe.png" },
                            { title: "Custom Agents", desc: "Build Your Own", img: "/images/robot-6.png" }
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
                                        <ArrowRight size={18} className="text-indigo-400 -rotate-45 group-hover:text-white group-hover:rotate-0 transition-all duration-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{agent.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- MULTI AGENT & BENEFITS --- */}
            <section className="py-32 px-4 bg-[#020202] relative">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="order-2 lg:order-1">
                            <MultiAgentFlow />
                        </div>
                        <div className="order-1 lg:order-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Why Multi-Agent?</h2>
                            <div className="space-y-8">
                                {[
                                    {
                                        title: "Specialization > Generalization",
                                        desc: "Smaller, specialized models outperform massive generalists on specific tasks.",
                                        icon: CheckCircle2
                                    },
                                    {
                                        title: "Parallel Execution",
                                        desc: "Agents work vertically and horizontally, slashing turnaround times by 10x.",
                                        icon: CheckCircle2
                                    },
                                    {
                                        title: "Self-Healing Workflows",
                                        desc: "If the 'Coder' fails, the 'Manager' detects it and re-prompts the 'Researcher'.",
                                        icon: CheckCircle2
                                    }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="mt-1 bg-white/10 rounded-full p-1 h-fit">
                                            <item.icon size={16} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                                            <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* --- AGENTIC TECHNOLOGY (New Bento Section) --- */}
            <section className="py-24 bg-[#010101] relative px-4">
                <div className="container mx-auto max-w-7xl">
                    <div className="mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-6 w-max">
                            <Code size={12} />
                            Platform Architecture
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Agentic Technology</h2>
                        <p className="text-gray-400 max-w-2xl text-lg">
                            An operating system designed for autonomous labor. Measure, monitor, and scale your digital workforce.
                        </p>
                    </div>

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
                        <div className="md:col-span-12 relative overflow-hidden h-[400px] border-b border-white/5">
                            <div className="grid md:grid-cols-3 h-full">
                                <div className="p-10 flex flex-col justify-center border-r border-white/5 z-10 bg-[#0A0A0A]/80 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] uppercase font-mono text-emerald-400">Live Intelligence</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-4">Actively monitors all context</h3>
                                    <p className="text-gray-400 text-sm">
                                        To capture & update knowledgebases for people, teams, projects, decisions, updates, and more.
                                    </p>
                                </div>
                                <div className="md:col-span-2 relative flex items-center justify-center bg-black">
                                    <div className="absolute inset-0 bg-[#050505]">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-emerald-500/10 rounded-full" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-emerald-500/20 rounded-full" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-emerald-500/30 rounded-full" />
                                        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-r from-emerald-500/20 to-transparent origin-bottom-left -translate-y-full animate-[spin_4s_linear_infinite]" />
                                    </div>

                                    <div className="absolute top-[30%] right-[30%] bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[10px] text-white">Competitor pricing changes</div>
                                    <div className="absolute bottom-[40%] left-[40%] bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[10px] text-white">Brand Voice Guidelines</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 4 & 5: Feature Grid (6 items wrapper) */}
                        <div className="md:col-span-12 grid md:grid-cols-3">
                            {/* Item 1: BrainGPT (Row 4) */}
                            <div className="p-10 flex flex-col justify-between h-[240px] border-b border-white/5 md:border-r">
                                <h3 className="text-3xl font-bold text-white tracking-tighter">BrainGPT</h3>
                                <p className="text-gray-500 text-sm">Proprietary models, architecture, and evals.</p>
                            </div>

                            {/* Item 2: Optimized Orchestration (Row 4) */}
                            <div className="p-10 flex flex-col justify-between h-[240px] border-b border-white/5 md:border-r">
                                <Workflow className="text-emerald-500 mb-4" size={28} />
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Optimized Orchestration</h4>
                                    <p className="text-gray-500 text-sm">Route to the best models from intent.</p>
                                </div>
                            </div>

                            {/* Item 3: Self-Learning (Row 4) */}
                            <div className="p-10 flex flex-col justify-between h-[240px] border-b border-white/5">
                                <ScanEye className="text-emerald-500 mb-4" size={28} />
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Self-Learning</h4>
                                    <p className="text-gray-500 text-sm">Continuous learning and improvement.</p>
                                </div>
                            </div>

                            {/* Item 4: Human-level Memory (Row 5) */}
                            <div className="p-10 flex flex-col justify-between h-[240px] border-b md:border-b-0 border-white/5 md:border-r">
                                <Brain className="text-emerald-500 mb-4" size={28} />
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Human-level Memory</h4>
                                    <p className="text-gray-500 text-sm">Short, Long-Term, & Episodic Memory.</p>
                                </div>
                            </div>

                            {/* Item 5: Sub-Agent Architecture (Row 5) */}
                            <div className="p-10 flex flex-col justify-between h-[240px] border-b md:border-b-0 border-white/5 md:border-r">
                                <Share2 className="text-emerald-500 mb-4" size={28} />
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Sub-Agent Architecture</h4>
                                    <p className="text-gray-500 text-sm">Multi-agent collaboration and delegation.</p>
                                </div>
                            </div>

                            {/* Item 6: Deep Research (Row 5) */}
                            <div className="p-10 flex flex-col justify-between h-[240px]">
                                <Search className="text-emerald-500 mb-4" size={28} />
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Deep Research & Compression</h4>
                                    <p className="text-gray-500 text-sm">Research optimally from compressed context.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- AGENTIC USER SECURITY --- */}
            <section className="py-24 bg-[#020202] relative">
                <div className="container mx-auto max-w-7xl px-4">
                    <div className="mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Agentic User Security</h2>
                        <p className="text-gray-400 max-w-xl">
                            Completely proprietary AI user data model compatible with all enterprise security systems.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-0 border border-white/10 rounded-3xl overflow-hidden bg-[#0A0A0A]">
                        {/* Panel 1: Audit */}
                        <div className="p-12 border-b md:border-b-0 md:border-r border-white/10">
                            <h3 className="text-xl font-bold text-white mb-4">Audit everything</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Extraordinarily deep insight and auditing into everything Agents do. Full playback history.
                            </p>
                            <div className="space-y-4">
                                {["Create task", "Post comment to channel", "Update status"].map((action, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="font-mono">09:1{i} AM</span>
                                        <span className="text-gray-300">{action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Panel 2: Zero Retention (Shield Center) */}
                        <div className="p-12 border-b md:border-b-0 md:border-r border-white/10 flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold text-white mb-4">Zero data retention.<br />Zero training.</h3>
                            <p className="text-gray-400 text-sm mb-8">
                                More secure than using OpenAI or Gemini directly. Your data stays yours.
                            </p>
                            <div className="mt-8 flex justify-center w-full">
                                <img src="/images/agent_security_audit_shield.png" alt="Secure Shield" className="w-[180px] h-[180px] object-contain" />
                            </div>
                        </div>

                        {/* Panel 3: Reflection Loop */}
                        <div className="p-12 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-4">Reflection</h3>
                            <p className="text-gray-400 text-sm mb-8">
                                Advanced execution loops that ensure Agents constantly reflect on work they're doing.
                            </p>
                            <div className="flex-1 flex items-center justify-center">
                                <img src="/images/agent_reflection_loop.png" alt="Reflection Loop" className="w-full max-w-[200px] object-contain opacity-80" />
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
            desc: "Agents have episodic memory, agent preferences memory, short-term memory and long-term memory.",
            img: "/images/agent_face_wireframe.png"
        },
        {
            id: "02",
            title: "Knowledge",
            desc: "Access to a vast, indexed knowledge base allowing for instant retrieval of relevant information.",
            img: "/images/superhero_wireframe_agent.png"
        },
        {
            id: "03",
            title: "Collaboration",
            desc: "Seamless communication between agents to solve complex, multi-step problems together.",
            img: "/images/agent_security_audit_shield.png"
        },
        {
            id: "04",
            title: "Execution",
            desc: "Autonomous task execution with error handling, retries, and success verification.",
            img: "/images/robot-6.png"
        },
        {
            id: "05",
            title: "Autonomy",
            desc: "Self-directed decision making based on high-level goals without constant human oversight.",
            img: "/images/superhero_wireframe_agent.png"
        },
        {
            id: "06",
            title: "Aware",
            desc: "Context-aware processing that understands nuances of time, user intent, and environment.",
            img: "/images/agent_face_wireframe.png"
        },
        {
            id: "07",
            title: "Feedback",
            desc: "Continuous learning loops that improve performance based on user corrections and outcomes.",
            img: "/images/agent_reflection_loop.png"
        }
    ];

    return (
        <section className="py-24 bg-[#020202] relative border-t border-white/5">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Interactive List */}
                    <div>
                        <div className="mb-12">
                            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Superhero <br /> Intelligence</h2>
                            <p className="text-gray-400 text-lg">
                                AI without context and engagement is useless. <br />
                                <span className="text-indigo-400">— Every AI Expert</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            {capabilities.map((cap) => (
                                <div
                                    key={cap.id}
                                    onClick={() => setActiveId(cap.id)}
                                    className={`group cursor-pointer border-t border-white/5 pt-6 pb-2 transition-all duration-300 ${activeId === cap.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                                >
                                    <h3 className={`text-2xl font-bold mb-2 flex items-center gap-4 transition-colors ${activeId === cap.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                        <span className={`font-mono text-lg transition-colors ${activeId === cap.id ? 'text-indigo-500' : 'text-gray-700 group-hover:text-indigo-500/50'}`}>{cap.id}</span>
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
                    </div>

                    {/* Right: Visual (Controlled by List) */}
                    <div className="relative h-[600px] flex items-center justify-center hidden lg:flex">
                        <div className="absolute inset-0 bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />
                        <div className="relative w-full h-full flex items-center justify-center">
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
        </section>
    );
}
