"use client";
import React from 'react';
import { Navigation } from '../_components/Navigation';
import { Footer } from '../_components/Footer';
import { Bot, Workflow, Users, LayoutGrid, ArrowRight, Zap, Shield, Globe, Cpu, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ProductPage() {
    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-teal-500/30 overflow-hidden">
            <Navigation />

            <main className="pt-40 pb-24 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[500px] bg-teal-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

                {/* Product Hero */}
                <div className="max-w-7xl mx-auto px-6 text-center mb-32 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold uppercase tracking-widest text-teal-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.1)]">
                        <Cpu size={14} className="text-orange-400" />
                        The Agentflox Platform
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter mb-8 leading-[1.05]">
                        One System.
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 drop-shadow-2xl">
                            Limitless Possibilities.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto mb-12">
                        Agentflox isn't just a tool; it's a complete operating system for modern ventures.
                        Orchestrate agents, automate workflows, and collaborate in real-time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link
                            href="/signup"
                            className="group/btn relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02] w-full sm:w-auto shadow-lg"
                        >
                            <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover/btn:bg-opacity-0 transition-all duration-500 z-0"></div>
                            <span className="relative z-20 flex items-center gap-3 text-base font-semibold text-white transition-all duration-300">
                                Start Building Free
                                <ArrowRight size={18} className="text-orange-300 group-hover/btn:text-white group-hover/btn:translate-x-1.5 transition-all duration-300" />
                            </span>
                        </Link>
                        <Link
                            href="/contact"
                            className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-medium text-base transition-all flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                        >
                            Book a Demo
                        </Link>
                    </div>
                </div>

                {/* Core Modules Grid */}
                <div className="max-w-7xl mx-auto px-6 mb-32 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Module 1: AI Agents */}
                        <div className="group relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/5 p-12 hover:border-teal-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(20,184,166,0.1)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl border border-white/10 flex items-center justify-center mb-8 group-hover:border-teal-500/30 group-hover:bg-teal-500/10 transition-colors shadow-xl">
                                    <Bot size={32} className="text-teal-400 drop-shadow-[0_0_8px_currentColor]" />
                                </div>
                                <h3 className="text-3xl font-semibold mb-4 text-white group-hover:text-teal-100 tracking-tight transition-colors">Autonomous Agents</h3>
                                <p className="text-gray-400 text-lg font-light mb-8 leading-relaxed flex-1 group-hover:text-gray-300 transition-colors">
                                    Deploy intelligent agents that act as teammates. They can research,
                                    code, write, and execute complex tasks without constant supervision.
                                </p>
                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Sparkles size={12} className="text-teal-400" />
                                        </div>
                                        <span>Multi-agent orchestration (LangGraph)</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Sparkles size={12} className="text-teal-400" />
                                        </div>
                                        <span>Human-in-the-loop controls</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Sparkles size={12} className="text-teal-400" />
                                        </div>
                                        <span>Persistent memory & context</span>
                                    </li>
                                </ul>
                                <Link href="/product/agents" className="inline-flex items-center gap-2 text-teal-400 font-medium group-hover:text-teal-300 transition-colors text-sm uppercase tracking-widest">
                                    Explore Agents <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Module 2: Automation */}
                        <div className="group relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/5 p-12 hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.1)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl border border-white/10 flex items-center justify-center mb-8 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 transition-colors shadow-xl">
                                    <Workflow size={32} className="text-cyan-400 drop-shadow-[0_0_8px_currentColor]" />
                                </div>
                                <h3 className="text-3xl font-semibold mb-4 text-white group-hover:text-cyan-100 tracking-tight transition-colors">Intelligent Automation</h3>
                                <p className="text-gray-400 text-lg font-light mb-8 leading-relaxed flex-1 group-hover:text-gray-300 transition-colors">
                                    Connect your stack with a visual workflow builder. Trigger actions
                                    based on events, schedules, or agent decisions.
                                </p>
                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap size={12} className="text-cyan-400" />
                                        </div>
                                        <span>Visual flowchart editor</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap size={12} className="text-cyan-400" />
                                        </div>
                                        <span>100+ native integrations</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap size={12} className="text-cyan-400" />
                                        </div>
                                        <span>Real-time execution logs</span>
                                    </li>
                                </ul>
                                <Link href="/product/automation" className="inline-flex items-center gap-2 text-cyan-400 font-medium group-hover:text-cyan-300 transition-colors text-sm uppercase tracking-widest">
                                    Explore Automation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Module 3: Collaboration */}
                        <div className="group relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/5 p-12 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl border border-white/10 flex items-center justify-center mb-8 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-colors shadow-xl">
                                    <Users size={32} className="text-blue-400 drop-shadow-[0_0_8px_currentColor]" />
                                </div>
                                <h3 className="text-3xl font-semibold mb-4 text-white group-hover:text-blue-100 tracking-tight transition-colors">Real-Time Collaboration</h3>
                                <p className="text-gray-400 text-lg font-light mb-8 leading-relaxed flex-1 group-hover:text-gray-300 transition-colors">
                                    Work together with your team and your agents in shared spaces.
                                    Docs, whiteboards, and chat — all in one place.
                                </p>
                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Globe size={12} className="text-blue-400" />
                                        </div>
                                        <span>Live multiplayer editing</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Globe size={12} className="text-blue-400" />
                                        </div>
                                        <span>Context-aware AI chat</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Globe size={12} className="text-blue-400" />
                                        </div>
                                        <span>Unified inbox for all notifications</span>
                                    </li>
                                </ul>
                                <Link href="/product/collaboration" className="inline-flex items-center gap-2 text-blue-400 font-medium group-hover:text-blue-300 transition-colors text-sm uppercase tracking-widest">
                                    Explore Collaboration <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Module 4: Venture OS */}
                        <div className="group relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/5 p-12 hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-[#0A0A0A] rounded-2xl border border-white/10 flex items-center justify-center mb-8 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-colors shadow-xl">
                                    <LayoutGrid size={32} className="text-emerald-400 drop-shadow-[0_0_8px_currentColor]" />
                                </div>
                                <h3 className="text-3xl font-semibold mb-4 text-white group-hover:text-emerald-100 tracking-tight transition-colors">Venture OS</h3>
                                <p className="text-gray-400 text-lg font-light mb-8 leading-relaxed flex-1 group-hover:text-gray-300 transition-colors">
                                    Manage your entire project lifecycle. From idea validation to
                                    resource allocation and growth tracking.
                                </p>
                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Shield size={12} className="text-emerald-400" />
                                        </div>
                                        <span>Project & task management</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Shield size={12} className="text-emerald-400" />
                                        </div>
                                        <span>Resource planning</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-gray-300 font-light">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Shield size={12} className="text-emerald-400" />
                                        </div>
                                        <span>Enterprise-grade security</span>
                                    </li>
                                </ul>
                                <Link href="/product/project-management" className="inline-flex items-center gap-2 text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors text-sm uppercase tracking-widest">
                                    Explore Venture OS <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integration Section Teaser */}
                <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-8">Trusted by forward-thinking teams at</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                        {/* Placeholders for logos */}
                        <div className="text-2xl font-bold font-serif text-white hover:opacity-100 transition-opacity cursor-default">ACME Corp</div>
                        <div className="text-2xl font-bold font-sans tracking-tighter text-white hover:opacity-100 transition-opacity cursor-default">GlobalTech</div>
                        <div className="text-2xl font-bold font-mono text-white hover:opacity-100 transition-opacity cursor-default">Nebula AI</div>
                        <div className="text-2xl font-bold font-serif italic text-white hover:opacity-100 transition-opacity cursor-default">FutureScale</div>
                        <div className="text-2xl font-bold font-sans text-white hover:opacity-100 transition-opacity cursor-default">Orbit</div>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}

