"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Layout, Users, Bot, Zap, Database,
    MessageSquare, FolderKanban, BarChart3,
    Settings, Search, Bell, Plus, MoreHorizontal,
    CheckCircle2, Circle, Clock, FileText
} from "lucide-react";

// --- MOCK UI COMPONENTS ---

const DashboardSidebar = () => (
    <div className="w-16 lg:w-64 border-r border-white/5 flex flex-col justify-between py-6 bg-[#080808]">
        <div className="flex flex-col gap-6 px-4">
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Layout size={18} className="text-indigo-400" />
                </div>
                <span className="hidden lg:block font-bold text-white tracking-wide">Agentflox<span className="text-indigo-500">.OS</span></span>
            </div>

            <div className="flex flex-col gap-1">
                <div className="text-[10px] uppercase text-gray-600 font-mono mb-2 hidden lg:block px-2">Workspace</div>
                {['Projects', 'Tasks', 'Members', 'Resources'].map((item, idx) => (
                    <div key={item} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${idx === 0 ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                        {idx === 0 && <FolderKanban size={18} />}
                        {idx === 1 && <CheckCircle2 size={18} />}
                        {idx === 2 && <Users size={18} />}
                        {idx === 3 && <Database size={18} />}
                        <span className="hidden lg:block text-sm">{item}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="px-4 flex flex-col gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 relative overflow-hidden hidden lg:block">
                <div className="relative z-10 flex flex-col gap-2">
                    <Bot size={20} className="text-indigo-400" />
                    <div className="text-xs text-gray-400">AI Assistance active.</div>
                </div>
            </div>
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10" />
                <div className="hidden lg:flex flex-col">
                    <span className="text-xs text-white">Alex Chen</span>
                    <span className="text-[10px] text-gray-500">Admin</span>
                </div>
            </div>
        </div>
    </div>
);

const ProjectView = () => (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <h3 className="text-white font-medium">Q4 Product Launch</h3>
                <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 uppercase tracking-wider">On Track</div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#0A0A0A] flex items-center justify-center text-[10px] text-white">
                            {['JD', 'AS', 'MR'][i - 1]}
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#0A0A0A] flex items-center justify-center text-[10px] text-gray-400">+4</div>
                </div>
                <button className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                    <Plus size={16} />
                </button>
            </div>
        </div>

        {/* Kanban Board */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
            {/* Column 1 */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 font-medium">To Do</span>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded">3</span>
                </div>
                {/* Task Cards */}
                <div className="p-4 rounded-xl bg-[#111] border border-white/5 hover:border-indigo-500/30 transition-colors group cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/10">Design</span>
                        <MoreHorizontal size={14} className="text-gray-600" />
                    </div>
                    <h4 className="text-sm text-gray-200 mb-2 group-hover:text-indigo-300 transition-colors">Update visuals for landing page</h4>
                    <div className="flex items-center gap-3 text-gray-500">
                        <div className="flex items-center gap-1 text-[10px]"><Clock size={12} /> 2d</div>
                        <div className="flex items-center gap-1 text-[10px]"><MessageSquare size={12} /> 4</div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-[#111] border border-white/5 hover:border-indigo-500/30 transition-colors group cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-orange-400 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/10">Copy</span>
                    </div>
                    <h4 className="text-sm text-gray-200 mb-2 group-hover:text-indigo-300 transition-colors">Draft email sequence</h4>
                </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 font-medium">In Progress</span>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded">2</span>
                </div>
                <div className="p-4 rounded-xl bg-[#111] border border-white/5 hover:border-indigo-500/30 transition-colors group cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/10">Dev</span>
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Bot size={12} />
                        </div>
                    </div>
                    <h4 className="text-sm text-gray-200 mb-2 group-hover:text-indigo-300 transition-colors">Implement auth flow</h4>
                    <div className="mt-2 p-2 rounded bg-white/5 text-[10px] text-gray-400 font-mono">
                        &gt; AI Agent analyzing auth0 docs...
                    </div>
                </div>
            </div>

            {/* Column 3 - Hidden on small screens */}
            <div className="hidden md:flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 font-medium">Done</span>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded">12</span>
                </div>
                <div className="p-4 rounded-xl bg-[#111]/50 border border-white/5 opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-sm text-gray-400 line-through">Setup Repo</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-[#111]/50 border border-white/5 opacity-60">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-sm text-gray-400 line-through">Configure CI/CD</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// --- MAIN SECTION ---

export const ProjectManagementSection = () => {
    const [activeTab, setActiveTab] = useState('collaboration');

    return (
        <section className="relative w-full py-24 bg-[#050505] overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">

                {/* Header */}
                <div className="max-w-3xl mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-6 backdrop-blur-sm">
                        <Layout size={12} />
                        Unified Workspace
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        Everything you need to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            ship projects faster.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg font-light leading-relaxed max-w-xl">
                        From spontaneous ideas to enterprise-scale execution. Manage tasks, documents, and teams in one fluid interface—supercharged by AI.
                    </p>
                </div>

                {/* Feature Showcase Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* BENTO CARD 1: Main Project UI (Spans 2 cols) */}
                    <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden min-h-[400px] shadow-2xl group flex flex-col">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5 ">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                            </div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Workspace View</div>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <DashboardSidebar />
                            <ProjectView />
                        </div>
                    </div>

                    {/* BENTO CARD 2: stacked smaller cards (Right col) */}
                    <div className="flex flex-col gap-8 h-full">

                        {/* Card 2a: AI Automation */}
                        <div className="flex-1 rounded-3xl border border-white/10 bg-[#0A0A0A] p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full -z-10 group-hover:bg-indigo-500/20 transition-all" />
                            <Zap size={24} className="text-indigo-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Automated Workflows</h3>
                            <p className="text-sm text-gray-400 font-light mb-6">
                                Let AI handle the busywork. Auto-assign tasks, summarize updates, and schedule meetings.
                            </p>
                            {/* Mini Visual */}
                            <div className="w-full bg-[#111] rounded-lg border border-white/5 p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <Bot size={12} className="text-indigo-400" />
                                    <span>If <span className="text-indigo-300">New Issue</span> created...</span>
                                </div>
                                <div className="h-4 w-0.5 bg-white/10 ml-1.5" />
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                                    <span>Auto-assign to <span className="text-emerald-300">@DevTeam</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2b: Resources & collaboration */}
                        <div className="flex-1 rounded-3xl border border-white/10 bg-[#0A0A0A] p-6 relative overflow-hidden group">
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full -z-10 group-hover:bg-purple-500/20 transition-all" />
                            <Database size={24} className="text-purple-400 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Centralized Resources</h3>
                            <p className="text-sm text-gray-400 font-light">
                                Shared memory for docs, credentials, and assets. Context-aware and searchable by your AI agents.
                            </p>
                        </div>

                    </div>

                    {/* BENTO CARD 3: Members & Capacity (Bottom Full Width or another row?) 
                        Let's actually just keep it to these two columns. 
                        Maybe add a bottom row for "Collaboration". 
                     */}

                    <div className="lg:col-span-3 rounded-3xl border border-white/10 bg-[#0A0A0A] p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex flex-col gap-4 max-w-xl z-10">
                            <div className="flex items-center gap-3">
                                <Users size={24} className="text-blue-400" />
                                <h3 className="text-xl font-semibold text-white">Seamless Collaboration</h3>
                            </div>
                            <p className="text-gray-400 font-light">
                                Real-time chat, inline comments, and collaborative editing. Your team and your AI agents, working side-by-side in the same threads.
                            </p>
                        </div>

                        {/* Mini Chat Visual */}
                        <div className="w-full md:max-w-md bg-[#111] rounded-xl border border-white/5 p-4 flex flex-col gap-3 z-10">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0" />
                                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none">
                                    <p className="text-xs text-gray-300">Can we optimize this query? It's slowing down the dashboard.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                    <Bot size={14} className="text-indigo-400" />
                                </div>
                                <div className="bg-indigo-500/10 border border-indigo-500/10 p-3 rounded-2xl rounded-tr-none">
                                    <p className="text-xs text-indigo-100">I've analyzed the query. Adding an index on `user_id` should reduce latency by ~40%. Shall I apply it?</p>
                                    <div className="mt-2 flex gap-2">
                                        <button className="px-3 py-1 rounded bg-indigo-500 text-white text-[10px]">Apply Fix</button>
                                        <button className="px-3 py-1 rounded bg-white/5 text-gray-400 text-[10px]">View Code</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
