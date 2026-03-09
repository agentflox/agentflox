"use client";
import React from 'react';
import { Navigation } from '../_components/Navigation';
import { Footer } from '../_components/Footer';
import { Bot, Workflow, Users, LayoutGrid, ArrowRight, Zap, Shield, Globe, Cpu, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ProductPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
            <Navigation />

            <main className="pt-32 pb-24">
                {/* Product Hero */}
                <div className="max-w-7xl mx-auto px-6 text-center mb-24">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-sm font-semibold text-indigo-400 mb-6">
                        <Cpu size={14} />
                        The Agentflox Platform
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
                        One System.
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                            Limitless Possibilities.
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
                        Agentflox isn't just a tool; it's a complete operating system for modern ventures.
                        Orchestrate agents, automate workflows, and collaborate in real-time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/signup" className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
                            Start Building Free
                        </Link>
                        <Link href="/contact" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-semibold hover:bg-white/10 transition-all">
                            Book a Demo
                        </Link>
                    </div>
                </div>

                {/* Core Modules Grid */}
                <div className="max-w-7xl mx-auto px-6 mb-32">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Module 1: AI Agents */}
                        <div className="group relative overflow-hidden rounded-3xl bg-slate-900/50 border border-white/10 p-10 hover:border-indigo-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Bot size={32} className="text-indigo-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Autonomous Agents</h3>
                                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                    Deploy intelligent agents that act as teammates. They can research,
                                    code, write, and execute complex tasks without constant supervision.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Sparkles size={16} className="text-indigo-400" />
                                        <span>Multi-agent orchestration (LangGraph)</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Sparkles size={16} className="text-indigo-400" />
                                        <span>Human-in-the-loop controls</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Sparkles size={16} className="text-indigo-400" />
                                        <span>Persistent memory & context</span>
                                    </li>
                                </ul>
                                <Link href="/product/agents" className="inline-flex items-center gap-2 text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                                    Explore Agents <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* Module 2: Automation */}
                        <div className="group relative overflow-hidden rounded-3xl bg-slate-900/50 border border-white/10 p-10 hover:border-purple-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Workflow size={32} className="text-purple-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Intelligent Automation</h3>
                                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                    Connect your stack with a visual workflow builder. Trigger actions
                                    based on events, schedules, or agent decisions.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Zap size={16} className="text-purple-400" />
                                        <span>Visual flowchart editor</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Zap size={16} className="text-purple-400" />
                                        <span>100+ native integrations</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Zap size={16} className="text-purple-400" />
                                        <span>Real-time execution logs</span>
                                    </li>
                                </ul>
                                <Link href="/product/automation" className="inline-flex items-center gap-2 text-purple-400 font-semibold group-hover:translate-x-1 transition-transform">
                                    Explore Automation <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* Module 3: Collaboration */}
                        <div className="group relative overflow-hidden rounded-3xl bg-slate-900/50 border border-white/10 p-10 hover:border-cyan-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Users size={32} className="text-cyan-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Real-Time Collaboration</h3>
                                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                    Work together with your team and your agents in shared spaces.
                                    Docs, whiteboards, and chat — all in one place.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Globe size={16} className="text-cyan-400" />
                                        <span>Live multiplayer editing</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Globe size={16} className="text-cyan-400" />
                                        <span>Context-aware AI chat</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Globe size={16} className="text-cyan-400" />
                                        <span>Unified inbox for all notifications</span>
                                    </li>
                                </ul>
                                <Link href="/product/collaboration" className="inline-flex items-center gap-2 text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
                                    Explore Collaboration <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>

                        {/* Module 4: Venture OS */}
                        <div className="group relative overflow-hidden rounded-3xl bg-slate-900/50 border border-white/10 p-10 hover:border-emerald-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <LayoutGrid size={32} className="text-emerald-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Venture OS</h3>
                                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                    Manage your entire project lifecycle. From idea validation to
                                    resource allocation and growth tracking.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Shield size={16} className="text-emerald-400" />
                                        <span>Project & task management</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Shield size={16} className="text-emerald-400" />
                                        <span>Resource planning</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Shield size={16} className="text-emerald-400" />
                                        <span>Enterprise-grade security</span>
                                    </li>
                                </ul>
                                <Link href="/product/project-management" className="inline-flex items-center gap-2 text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                                    Explore Venture OS <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Integration Section Teaser */}
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-400 mb-8">Trusted by forward-thinking teams at</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholders for logos */}
                        <div className="text-xl font-bold text-white">ACME Corp</div>
                        <div className="text-xl font-bold text-white">GlobalTech</div>
                        <div className="text-xl font-bold text-white">Nebula AI</div>
                        <div className="text-xl font-bold text-white">FutureScale</div>
                        <div className="text-xl font-bold text-white">Orbit</div>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}
