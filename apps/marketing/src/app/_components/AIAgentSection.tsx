"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Zap, Sparkles, User, Wrench, GitBranch, Files, ArrowRight, MessageSquare, Terminal, MousePointer2, Cloud, Hash, Mail, FileText, Users, LayoutGrid, HelpCircle, ShoppingBag, Database, Square, Layers, Kanban, Edit3, Box, Phone, Cpu, PieChart, Activity, Github, GitMerge, MessageCircle, Folder, Calendar, CheckCircle2, Globe, Shield, ChevronUp, RefreshCcw, X, Check, AlertTriangle, Brain, Network, Telescope, Waypoints, List } from 'lucide-react';
import { motion, useAnimation, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { AgentBuilderSimulation } from '../product/agents/_components/AgentBuilderSimulation';


// --- MOCK WORKFORCE CANVAS & SWARM ANIMATION (SPLIT VIEW) ---
const WorkforcesSplitDemo = () => {
    return (
        <div className="w-full h-[1200px] md:h-[600px] flex flex-col rounded-2xl border border-white/5 bg-[#111] overflow-hidden shadow-2xl relative font-sans">
            {/* Mac Window Header */}
            <div className="h-12 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 flex items-center px-4 justify-between w-full flex-shrink-0">
                <div className="flex gap-1.5 w-1/3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="w-1/3" />
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Swarm Demo */}
                <div className="w-full h-1/2 md:h-full md:w-1/2 flex bg-white border-b md:border-b-0 md:border-r border-gray-200 z-10 relative overflow-hidden">
                    {/* Config Sidebar */}
                    <div className="hidden md:flex flex-col w-[120px] xl:w-[140px] flex-shrink-0 h-full bg-gray-50/50 border-r border-gray-200 p-4 gap-4">
                        <div className="h-2.5 w-16 bg-gray-300 rounded-full mb-2" />
                        <div className="space-y-3">
                            <div className="h-8 w-full bg-white border border-gray-200 rounded-md shadow-sm" />
                            <div className="h-8 w-full bg-white border border-gray-200 rounded-md shadow-sm" />
                            <div className="h-8 w-full bg-indigo-50 border border-indigo-100 rounded-md shadow-sm flex items-center px-2 gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <div className="h-1.5 w-8 bg-indigo-200 rounded-full" />
                            </div>
                        </div>
                        <div className="mt-auto h-8 w-full bg-emerald-500 rounded-md shadow-sm flex items-center justify-center">
                            <div className="h-1.5 w-8 bg-white/60 rounded-full" />
                        </div>
                    </div>

                    {/* Swarm Canvas */}
                    <div className="flex-1 relative h-full bg-white overflow-hidden" style={{
                        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}>
                        {/* Title Label */}
                        <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest shadow-sm">
                            Agent Swarms
                        </div>

                        {/* SVG Edges */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {/* Coordinator to Workers */}
                            <path d="M 200 140 C 200 190, 70 190, 70 240" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                            <path d="M 200 140 C 200 190, 200 190, 200 240" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                            <path d="M 200 140 C 200 190, 330 190, 330 240" fill="none" stroke="#cbd5e1" strokeWidth="2" />

                            {/* Workers to Pool Task (Dashed) */}
                            <path d="M 70 290 C 70 340, 200 330, 200 380" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 4" />
                            <path d="M 200 290 C 200 340, 200 330, 200 380" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 4" />
                            <path d="M 330 290 C 330 340, 200 330, 200 380" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 4" />

                            {/* Animated Edge Pulses (Purple) */}
                            <motion.path d="M 200 140 C 200 190, 70 190, 70 240" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="10 150" animate={{ strokeDashoffset: [0, -150] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                            <motion.path d="M 200 140 C 200 190, 200 190, 200 240" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="10 150" animate={{ strokeDashoffset: [0, -150] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }} />
                            <motion.path d="M 200 140 C 200 190, 330 190, 330 240" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="10 150" animate={{ strokeDashoffset: [0, -150] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1 }} />
                        </svg>

                        {/* Router Agent (Coordinator) */}
                        <div className="absolute top-[50px] left-[150px] w-[100px] bg-white border-2 border-purple-200 rounded-2xl shadow-md p-3 text-center z-10">
                            <div className="w-10 h-10 mx-auto bg-purple-50 rounded-full mb-2 flex items-center justify-center text-purple-600 border border-purple-100">
                                <Bot size={18} />
                            </div>
                            <div className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Router</div>
                        </div>

                        {/* Worker Agents */}
                        <div className="absolute top-[240px] left-[15px] w-[110px] bg-white border border-gray-200 rounded-xl shadow-sm p-2 flex items-center gap-2 z-10">
                            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex-shrink-0 flex items-center justify-center"><User size={14} /></div>
                            <div className="text-xs font-semibold text-gray-700">Support</div>
                        </div>
                        <div className="absolute top-[240px] left-[145px] w-[110px] bg-white border border-gray-200 rounded-xl shadow-sm p-2 flex items-center gap-2 z-10">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex-shrink-0 flex items-center justify-center"><GitBranch size={14} /></div>
                            <div className="text-xs font-semibold text-gray-700">Sales</div>
                        </div>
                        <div className="absolute top-[240px] left-[275px] w-[110px] bg-white border border-gray-200 rounded-xl shadow-sm p-2 flex items-center gap-2 z-10">
                            <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex-shrink-0 flex items-center justify-center"><Wrench size={14} /></div>
                            <div className="text-xs font-semibold text-gray-700">Tech</div>
                        </div>

                        {/* Task Pool */}
                        <div className="absolute top-[380px] left-[75px] w-[250px] bg-white border-2 border-dashed border-gray-200 rounded-xl shadow-sm p-3 flex items-center gap-3 z-10">
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex-shrink-0 flex items-center justify-center"><Files size={14} /></div>
                            <div className="text-xs font-semibold text-gray-700">Task Pool</div>
                            <div className="ml-auto bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md">3 TASKS</div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Workflow Demo */}
                <div className="w-full h-1/2 md:h-full md:w-1/2 relative overflow-hidden bg-[#fafafa]" style={{
                    backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}>
                    {/* Title Label */}
                    <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest shadow-sm">
                        Workforce Canvas
                    </div>

                    {/* SVG Edges */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        <path d="M 110 126 C 110 143, 210 143, 210 160" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                        <path d="M 210 226 C 210 243, 110 243, 110 260" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                        <motion.path
                            d="M 110 326 C 110 353, 230 353, 230 380"
                            fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 4"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: [0, 0, 0, 1, 1], opacity: [0, 0, 0, 1, 1], strokeDashoffset: [0, 0, 0, -20, -40] }}
                            transition={{ duration: 5, repeat: Infinity, times: [0, 0.4, 0.65, 0.8, 1], ease: "linear" }}
                        />
                    </svg>

                    {/* Trigger */}
                    <div className="absolute top-[60px] left-[40px] w-[140px] bg-white border border-gray-200 rounded-2xl shadow-sm p-2.5 z-10">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1 rounded-md bg-orange-50 text-orange-500 border border-orange-100"><Zap size={12} /></div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Trigger</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-900">New Lead</div>
                    </div>

                    {/* Condition */}
                    <div className="absolute top-[160px] left-[140px] w-[140px] bg-white border border-gray-200 rounded-2xl shadow-sm p-2.5 z-10">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1 rounded-md bg-purple-50 text-purple-500 border border-purple-100"><GitBranch size={12} /></div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Condition</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-900">Score &gt; 80</div>
                    </div>

                    {/* Agent */}
                    <div className="absolute top-[260px] left-[40px] w-[140px] bg-white border border-gray-200 rounded-2xl shadow-sm p-2.5 z-10">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1 rounded-md bg-blue-50 text-blue-500 border border-blue-100"><User size={12} /></div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Agent</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-900">Sales Rep</div>
                    </div>

                    {/* Dragged Tool Node */}
                    <motion.div
                        initial={{ x: 260, y: 460, scale: 0.8, opacity: 1, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        animate={{
                            x: [260, 260, 160, 160, 160],
                            y: [460, 460, 380, 380, 380],
                            scale: [0.7, 0.7, 1.05, 1, 1],
                            boxShadow: ['0 10px 15px -3px rgb(0 0 0 / 0.1)', '0 10px 15px -3px rgb(0 0 0 / 0.1)', '0 20px 25px -5px rgb(0 0 0 / 0.2)', '0 4px 6px -1px rgb(0 0 0 / 0.1)', '0 4px 6px -1px rgb(0 0 0 / 0.1)']
                        }}
                        transition={{ duration: 5, repeat: Infinity, times: [0, 0.15, 0.4, 0.45, 1] }}
                        className="absolute top-0 left-0 w-[140px] bg-white border border-emerald-300 rounded-2xl p-2.5 z-20 cursor-grab"
                    >
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1 rounded-md bg-emerald-50 text-emerald-500 border border-emerald-100"><Wrench size={12} /></div>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Tool</span>
                        </div>
                        <div className="text-xs font-semibold text-gray-900">Send Email</div>
                    </motion.div>

                    {/* Animated Cursor */}
                    <motion.div
                        initial={{ x: 330, y: 500, opacity: 0 }}
                        animate={{
                            opacity: [0, 1, 1, 1, 1, 1, 0, 0],
                            x: [330, 330, 230, 230, 100, 100, 330, 330],
                            y: [500, 500, 420, 420, 400, 520, 520, 500],
                            scale: [1, 0.9, 0.9, 1, 1, 1, 1, 1]
                        }}
                        transition={{ duration: 5, repeat: Infinity, times: [0, 0.1, 0.4, 0.5, 0.65, 0.8, 0.9, 1] }}
                        className="absolute top-0 left-0 z-50 pointer-events-none drop-shadow-xl"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.5 3.21V20.8C5.5 21.45 6.27 21.79 6.75 21.36L11.44 17.12C11.71 16.88 12.06 16.74 12.43 16.74H19.5C20.17 16.74 20.5 15.93 20.03 15.46L6.91 2.34C6.44 1.87 5.5 2.2 5.5 3.21Z" fill="#1e293b" stroke="white" strokeWidth="2" />
                        </svg>
                    </motion.div>

                    {/* Fake Tray */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-[24px] shadow-lg p-1.5 flex gap-1.5 z-10">
                        <div className="w-16 xl:w-20 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500">Agent</div>
                        <div className="w-16 xl:w-20 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 opacity-30">Tool</div>
                        <div className="w-16 xl:w-20 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500">Task</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AIAgentSection = () => {
    const [toolIndex, setToolIndex] = useState(0);
    const [count, setCount] = useState(11);

    const apiTools = [
        "Task Management",
        "Content Creation",
        "Code Operation",
        "Browser Automation",
        "Media Generation",
        "File Operation",
        "Agent Orchestration",
        "API Integration"
    ];


    useEffect(() => {
        const interval = setInterval(() => {
            setCount((prevCount) => (prevCount >= 20 ? 11 : prevCount + 1));
        }, 1000); // Changes the number every 1000ms (1 second)

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setToolIndex((prev) => (prev + 1) % apiTools.length);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative w-full pb-20 bg-[#030303] text-white overflow-hidden border-b border-white/5">
            {/* Background Glows */}
            <div className="absolute top-[10%] left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] opacity-40 pointer-events-none" />
            <div className="absolute bottom-[10%] right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] opacity-40 pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-16 mb-20 w-full">
                    {/* Left: Text */}
                    <div className="max-w-4xl">
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">From one agent to an entire digital department.</span> Deploy single sovereign agents with real guardrails to execute tasks, or chain them into a swarm for parallel, collaborative work.
                        </h2>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-10 xl:gap-12 shrink-0">
                        {/* Stat 1 */}
                        <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                            <div className="text-3xl md:text-4xl lg:text-[40px] font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 tracking-tight leading-none">50M+</div>
                            <div className="text-sm font-medium text-[#8A8F98]">Agentic workflow runs</div>
                        </div>
                        {/* Stat 2 */}
                        <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                            <div className="text-3xl md:text-4xl lg:text-[40px] font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 tracking-tight leading-none">2,000+</div>
                            <div className="text-sm font-medium text-[#8A8F98]">Agents created</div>
                        </div>
                        {/* Stat 3 */}
                        <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                            <div className="text-3xl md:text-4xl lg:text-[40px] font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 tracking-tight leading-none">1,000+</div>
                            <div className="text-sm font-medium text-[#8A8F98]">Workforces created</div>
                        </div>
                    </div>
                </div>

                {/* Stacked Layout - Continuous Grid */}
                <div className="flex flex-col w-full border border-dashed border-white/15 rounded-3xl overflow-hidden shadow-2xl bg-[#0A0A0A]">
                    {/* Section Header */}
                    <div className="w-full border-b border-dashed border-white/15 px-8 md:px-10 py-6 bg-[#030303]">
                        <div className="relative inline-block px-3 py-1 text-[14px] text-gray-400 font-medium tracking-widest uppercase
                            /* Top-Right Corner Bracket */
                            before:absolute before:top-0 before:right-0 before:w-1.5 before:h-1.5 before:border-t before:border-r before:border-gray-500
                            /* Bottom-Left Corner Bracket */
                            after:absolute after:bottom-0 after:left-0 after:w-1.5 after:h-1.5 after:border-b after:border-l after:border-gray-500">
                            AGENT
                        </div>
                    </div>

                    {/* Card 1: Sovereign Agent */}
                    <div className="border-b border-dashed border-white/15 flex flex-col transition-all duration-300 hover:shadow-indigo-500/10 group bg-[#0A0A0A] relative z-10">
                        <div className="p-8 md:p-10 border-b border-white/5">
                            <div className="flex flex-row items-center justify-between mb-6 gap-4">
                                <h3 className="text-2xl sm:text-3xl font-bold text-white">Sovereign Agents</h3>
                                <Link href={ROUTES.SIGNUP} className="group relative shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 text-white font-medium overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/50 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]">
                                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)] transition-transform duration-500">
                                        <div className="relative h-full w-12 bg-white/10 blur-[4px]" />
                                    </div>
                                    <span className="relative z-10">Build an agent</span>
                                    <ArrowRight size={16} className="relative z-10 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                            <div className="lg:max-w-[55%]">
                                <p className="text-gray-400 text-base leading-relaxed">
                                    Build autonomous agents using natural language. Equip them with tools, set guardrails, and let them execute complex tasks securely on their own.
                                </p>

                                {/* Sovereign Agent Features List */}
                                <div className="mt-8 space-y-4">
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <Wrench className="text-[#f85149] shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Equip every agent with tools — web search, code execution, file access, API calls, and custom MCP tools</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <Database className="text-[#f85149] shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Persistent memory lets agents remember context, preferences, and outcomes across every run</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <Terminal className="text-[#f85149] shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Natural language instructions — no code needed to define goals, constraints, and behavior</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <Shield className="text-[#f85149] shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Built-in guardrails keep agents within defined boundaries even when operating fully autonomously</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 lg:p-10 bg-[#050505]">
                            <AgentBuilderSimulation />
                        </div>
                    </div>

                    {/* Intermediate Section: Infinite Knowledge Grid */}
                    <div className="w-full border-b border-dashed border-white/15 grid grid-cols-1 lg:grid-cols-9 relative bg-[#030303]">
                        {/* Col 1 */}
                        <div className="lg:col-span-3 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col justify-center relative z-10">
                            <h3 className="text-3xl font-bold text-white tracking-tight mb-5">Infinite Capacity</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                Give your autonomous workforce boundless reach. Seamlessly connect to your entire tech stack with native enterprise integrations, deploy unlimited custom tools, and retrieve deep context instantly with built-in vector search.
                            </p>
                        </div>

                        {/* Col 2: FIG 1 */}
                        <div className="lg:col-span-2 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col relative z-10 overflow-hidden">
                            <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-widest">INTEGRATIONS</div>
                            <div className="flex-1 flex items-center justify-center min-h-[220px] relative border border-dashed border-white/10 bg-[#030303]">

                                {/* Crosshairs / Grid Lines */}
                                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
                                    <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                    <div className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45" />
                                    <div className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45" />
                                </div>

                                {/* Animated Dots on Lines */}
                                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                                    {/* Horizontal moving dot (Right) */}
                                    <div className="absolute w-full h-[1px]">
                                        <motion.div
                                            className="absolute top-1/2 left-[50%] w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] -translate-y-1/2"
                                            animate={{ left: ["50%", "90%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </div>
                                    {/* Horizontal moving dot (Left) */}
                                    <div className="absolute w-full h-[1px]">
                                        <motion.div
                                            className="absolute top-1/2 right-[50%] w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)] -translate-y-1/2"
                                            animate={{ right: ["50%", "90%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                        />
                                    </div>
                                    {/* Vertical moving dot (Up) */}
                                    <div className="absolute h-full w-[1px]">
                                        <motion.div
                                            className="absolute top-[50%] left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] -translate-x-1/2"
                                            animate={{ top: ["50%", "10%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                        />
                                    </div>
                                    {/* Vertical moving dot (Down) */}
                                    <div className="absolute h-full w-[1px]">
                                        <motion.div
                                            className="absolute bottom-[50%] left-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] -translate-x-1/2"
                                            animate={{ bottom: ["50%", "10%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                                        />
                                    </div>
                                    {/* Diagonal 45 */}
                                    <div className="absolute w-[200%] h-[1px] rotate-45">
                                        <motion.div
                                            className="absolute top-1/2 left-[50%] w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] -translate-y-1/2"
                                            animate={{ left: ["50%", "75%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                        />
                                    </div>
                                    {/* Diagonal -45 */}
                                    <div className="absolute w-[200%] h-[1px] -rotate-45">
                                        <motion.div
                                            className="absolute top-1/2 right-[50%] w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] -translate-y-1/2"
                                            animate={{ right: ["50%", "75%", "50%"], opacity: [0, 1, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                        />
                                    </div>
                                </div>

                                {/* Central Green Glow */}
                                <div className="absolute w-24 h-24 bg-green-500/20 rounded-full blur-xl z-0 pointer-events-none"></div>

                                {/* Orbiting apps graphic */}
                                <div className="absolute w-[160px] h-[160px] rounded-full border border-dashed border-white/10 z-0"></div>
                                <div className="absolute w-[100px] h-[100px] rounded-full border border-dashed border-white/10 z-0"></div>

                                <div className="w-14 h-14 rounded-full bg-[#0a0a0a] border border-white/10 shadow-[0_0_30px_rgba(74,222,128,0.3)] flex items-center justify-center z-20 relative">
                                    <img src="/images/logo.png" alt="Agentflox" className="w-7 h-7 object-contain" />
                                </div>

                                {/* Orbiting icons - Perfectly distributed on R=80 circle matching the 8 crosshairs */}
                                {/* Top: 0px, -80px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% + 0px), calc(-50% - 80px))' }}>
                                    <img src="/images/apps/Microsoft_Office_Teams_(2019–2025).svg.webp" className="w-4 h-4 object-contain" alt="Figma" />
                                </div>
                                {/* Top-Right: 56.6px, -56.6px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% + 56.6px), calc(-50% - 56.6px))' }}>
                                    <img src="/images/apps/github_logo_icon_229278.webp" className="w-4 h-4 object-contain" alt="GitHub" />
                                </div>
                                {/* Right: 80px, 0px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% + 80px), calc(-50%))' }}>
                                    <img src="/images/apps/Gmail_Logo_512px.webp" className="w-4 h-4 object-contain" alt="Gmail" />
                                </div>
                                {/* Bottom-Right: 56.6px, 56.6px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% + 56.6px), calc(-50% + 56.6px))' }}>
                                    <img src="/images/apps/Google_Drive_Logo_512px.webp" className="w-4 h-4 object-contain" alt="Drive" />
                                </div>
                                {/* Bottom: 0px, 80px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% + 0px), calc(-50% + 80px))' }}>
                                    <img src="/images/apps/Google_Calendar_Logo_512px.png" className="w-4 h-4 object-contain" alt="Calendar" />
                                </div>
                                {/* Bottom-Left: -56.6px, 56.6px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% - 56.6px), calc(-50% + 56.6px))' }}>
                                    <img src="/images/apps/2111615.png" className="w-4 h-4 object-contain" alt="Slack" />
                                </div>
                                {/* Left: -80px, 0px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% - 80px), calc(-50%))' }}>
                                    <img src="/images/apps/figma-icon.webp" className="w-4 h-4 object-contain" alt="Figma" />
                                </div>
                                {/* Top-Left: -56.6px, -56.6px */}
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10 z-10 shadow-lg" style={{ transform: 'translate(calc(-50% - 56.6px), calc(-50% - 56.6px))' }}>
                                    <img src="/images/apps/Notion_app_logo.png" className="w-4 h-4 object-contain" alt="Figma" />
                                </div>
                            </div>
                            <div className="mt-5 text-sm font-medium text-white text-center leading-snug">Enterprise Integrations<br />Seamless API Connectivity</div>
                        </div>

                        {/* Col 3: FIG 2 */}
                        <div className="lg:col-span-2 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col relative z-10">
                            <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-widest">TOOLS</div>
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] relative border border-dashed border-white/10 bg-[#030303] overflow-hidden">
                                <div className="font-mono text-[11px] text-[#555] text-center leading-relaxed relative z-10 h-[48px] flex flex-col items-center justify-end w-full overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`top-${toolIndex}`}
                                            className="w-full flex justify-center text-center"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {apiTools[(toolIndex - 1 + apiTools.length) % apiTools.length].toUpperCase()}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <div className="my-2 bg-green-500/10 text-green-400 font-mono text-[11px] py-1.5 w-full text-center tracking-widest relative z-10 font-bold border-y border-green-500/20 backdrop-blur-sm overflow-hidden h-[28px] flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`mid-${toolIndex}`}
                                            className="w-full flex justify-center text-center"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {apiTools[toolIndex].toUpperCase()}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                                <div className="font-mono text-[11px] text-[#555] text-center leading-relaxed relative z-10 h-[48px] flex flex-col items-center justify-start w-full overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`bot-${toolIndex}`}
                                            className="w-full flex justify-center text-center"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {apiTools[(toolIndex + 1) % apiTools.length].toUpperCase()}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="mt-5 text-sm font-medium text-white text-center leading-snug">Unlimited Agent Tools<br />Deploy Custom MCP APIs & Actions</div>
                        </div>

                        {/* Col 4: FIG 3 */}
                        <div className="lg:col-span-2 p-6 lg:p-8 flex flex-col relative z-10">
                            <div className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-widest">FIG 3</div>
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] relative border border-dashed border-white/10 bg-[#030303]">
                                {/* Gauge Graphic */}
                                <div className="relative w-32 h-32 flex flex-col items-center justify-center">
                                    {/* Outer dashed track */}
                                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/5 rotate-45"></div>
                                    <div className="absolute inset-1 rounded-full border border-dashed border-white/5 -rotate-45"></div>

                                    {/* Inner solid track */}
                                    <svg className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] animate-[spin_6s_linear_infinite]" viewBox="0 0 100 100">
                                        {/* Defining the gradient sweep with a stronger fallback opacity */}
                                        <defs>
                                            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
                                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                                                <stop offset="85%" stopColor="#22c55e" stopOpacity="0.05" />
                                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                                            </radialGradient>
                                        </defs>

                                        {/* Main Outer Boundary Ring (Solid + Glowing) */}
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#22c55e" strokeWidth="1.25" strokeOpacity="0.4" className="drop-shadow-[0_0_4px_rgba(34,197,94,0.2)]" />

                                        {/* Radar Grid Rings (Increased stroke widths and opacities) */}
                                        <circle cx="50" cy="50" r="32" fill="none" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.25" strokeDasharray="3 3" />
                                        <circle cx="50" cy="50" r="18" fill="none" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.2" />

                                        {/* Crosshairs (Sharper center references) */}
                                        <line x1="50" y1="5" x2="50" y2="95" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.25" strokeDasharray="1 4" />
                                        <line x1="5" y1="50" x2="95" y2="50" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.25" strokeDasharray="1 4" />

                                        {/* Scanning Sweep (Pie segment) */}
                                        <path d="M 50 50 L 50 5 A 45 45 0 0 1 81.8 18.2 Z" fill="url(#radarSweep)" />

                                        {/* Leading Edge Beam (Thicker line with intense green glow) */}
                                        <line x1="50" y1="50" x2="50" y2="5" stroke="#22c55e" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />

                                        {/* "Found" Vector Nodes (Simulated Match - enhanced size and glow) */}
                                        <circle cx="75" cy="30" r="3" fill="#22c55e" className="animate-ping" style={{ animationDuration: '2s' }} />
                                        <circle cx="75" cy="30" r="2" fill="#22c55e" className="drop-shadow-[0_0_6px_#22c55e]" />
                                    </svg>

                                    <div className="relative z-10 flex flex-col items-center mt-3">
                                        <div className="text-2xl font-bold text-white tracking-tight">{count}M+</div>
                                        <div className="text-[9px] tracking-widest text-gray-500 uppercase mt-0.5">Searches</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 text-sm font-medium text-white text-center leading-snug">RAG Vector Database<br />High-Speed Semantic Search</div>
                        </div>
                    </div>

                    {/* BrainGPT Grid */}
                    <div className="w-full border-b border-dashed border-white/15 grid grid-cols-1 lg:grid-cols-3 relative bg-[#030303]">
                        {/* Row 1 */}
                        <div className="p-8 lg:p-10 border-b border-dashed border-white/15 lg:border-r flex flex-col justify-center relative z-10">
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">AgentFlox Neural Core</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                State-of-the-art proprietary reasoning models, bespoke cognitive architectures, and relentless adversarial evaluations.
                            </p>
                        </div>

                        <div className="p-8 lg:p-10 border-b border-dashed border-white/15 lg:border-r flex flex-col items-center justify-center text-center relative z-10">
                            <RefreshCcw className="text-green-500 mb-4" size={24} strokeWidth={1.5} />
                            <h4 className="text-lg font-bold text-white tracking-tight mb-2">Autonomous Self-Optimization</h4>
                            <p className="text-gray-400 text-sm">
                                Continuous reinforcement learning enables agents to refine behavior and adapt to edge cases instantly.
                            </p>
                        </div>

                        <div className="p-8 lg:p-10 border-b border-dashed border-white/15 flex flex-col items-center justify-center text-center relative z-10">
                            <Waypoints className="text-green-500 mb-4" size={24} strokeWidth={1.5} />
                            <h4 className="text-lg font-bold text-white tracking-tight mb-2">Dynamic Model Routing</h4>
                            <p className="text-gray-400 text-sm">
                                Intelligent query analysis routes tasks to the optimal underlying LLM based on intent and complexity.
                            </p>
                        </div>

                        {/* Row 2 */}
                        <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col items-center justify-center text-center relative z-10">
                            <Brain className="text-green-500 mb-4" size={24} strokeWidth={1.5} />
                            <h4 className="text-lg font-bold text-white tracking-tight mb-2">Persistent Cognitive Memory</h4>
                            <p className="text-gray-400 text-sm">
                                Seamlessly fuse semantic, episodic, and long-term working memory for unparalleled context persistence.
                            </p>
                        </div>
                        <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col items-center justify-center text-center relative z-10">
                            <Telescope className="text-green-500 mb-4" size={24} strokeWidth={1.5} />
                            <h4 className="text-lg font-bold text-white tracking-tight mb-2">Deep Context Compression</h4>
                            <p className="text-gray-400 text-sm">
                                Synthesize and distill massive datasets into ultra-dense vectors for high-speed retrieval and reasoning.
                            </p>
                        </div>
                        <div className="p-8 lg:p-10 flex flex-col items-center justify-center text-center relative z-10">
                            <Network className="text-green-500 mb-4" size={24} strokeWidth={1.5} />
                            <h4 className="text-lg font-bold text-white tracking-tight mb-2">Swarm Intelligence Architecture</h4>
                            <p className="text-gray-400 text-sm">
                                Deploy hierarchical multi-agent clusters capable of distributed processing and automated delegation.
                            </p>
                        </div>
                    </div>

                    {/* Workforce Header */}
                    <div className="w-full border-b border-dashed border-white/15 px-8 md:px-10 py-6 bg-[#030303]">
                        <div className="relative inline-block px-3 py-1 text-[14px] text-gray-400 font-medium tracking-widest uppercase
                                /* Top-Left Corner Bracket */
                                before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:border-t before:border-l before:border-gray-500
                                /* Bottom-Right Corner Bracket */
                                after:absolute after:bottom-0 after:right-0 after:w-1.5 after:h-1.5 after:border-b after:border-r after:border-gray-500">
                            WORKFORCE
                        </div>
                    </div>

                    {/* Card 2: AI Workforces */}
                    <div className="flex flex-col transition-all duration-300 hover:shadow-purple-500/10 group bg-[#0A0A0A] relative z-10">
                        <div className="p-8 md:p-10 border-b border-white/5">
                            <div className="flex flex-row items-center justify-between mb-6 gap-4">
                                <h3 className="text-2xl sm:text-3xl font-bold text-white">Agent Workforces</h3>
                                <Link href={ROUTES.SIGNUP} className="group relative shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 text-white font-medium overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)]">
                                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)] transition-transform duration-500">
                                        <div className="relative h-full w-12 bg-white/10 blur-[4px]" />
                                    </div>
                                    <span className="relative z-10">Orchestrate a swarm</span>
                                    <ArrowRight size={16} className="relative z-10 text-purple-400 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                            <div className="lg:max-w-[55%]">
                                <p className="text-gray-400 text-base leading-relaxed">
                                    Assemble specialized agents into coordinated teams. Delegate tasks, share context, and run parallel workstreams — all from one unified orchestration layer.
                                </p>

                                {/* Workforces Features List */}
                                <div className="mt-8 space-y-4">
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <GitBranch className="text-purple-400 shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Visual canvas to wire agents together with conditional branches, triggers, and parallel execution paths</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <Users className="text-purple-400 shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Role-based agent specialization — assign each agent a dedicated function within the team</p>
                                    </div>
                                    <div className="flex gap-4 items-start border-b border-white/5 pb-4">
                                        <Activity className="text-purple-400 shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Live workforce dashboard tracks progress, handoffs, and outcomes across every active agent in real time</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <Layers className="text-purple-400 shrink-0 mt-0.5" size={20} />
                                        <p className="text-gray-300 leading-snug">Shared memory and context bus lets agents collaborate and pass results without manual intervention</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 lg:p-10 bg-[#050505]">
                            <WorkforcesSplitDemo />
                        </div>
                    </div>

                    {/* Security Header */}
                    <div className="w-full border-t border-b border-dashed border-white/15 px-8 md:px-10 py-6 bg-[#030303]">
                        <div className="relative inline-block px-3 py-1 text-[14px] text-gray-400 font-medium tracking-widest uppercase
                            /* Top-Right Corner Bracket */
                            before:absolute before:top-0 before:right-0 before:w-1.5 before:h-1.5 before:border-t before:border-r before:border-gray-500
                            /* Bottom-Left Corner Bracket */
                            after:absolute after:bottom-0 after:left-0 after:w-1.5 after:h-1.5 after:border-b after:border-l after:border-gray-500">
                            SECURITY
                        </div>
                    </div>

                    {/* Security & Reflection Section */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-3 relative bg-[#030303]">
                        {/* Col 1: Audit everything */}
                        <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col justify-start relative z-10">
                            <div className="min-h-[120px] lg:min-h-[140px] mb-8 lg:mb-12">
                                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">End-to-end auditing</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    End-to-end system auditing paired with advanced, human-centric task execution.
                                </p>
                            </div>

                            <div className="relative flex-1 w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,white_5%,white_95%,transparent)]">
                                <div className="absolute top-0 left-4 bottom-0 w-[1px] bg-zinc-800/80"></div>
                                <div className="absolute flex flex-col top-0 left-0 w-full animate-live-feed pl-10 pt-4">
                                    {[1, 2].map((_, i) => (
                                        <div key={i} className="flex flex-col gap-8 pb-8">
                                            {/* Item 1: Summarize weekly report */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[32px] top-1 w-4 h-4 bg-[#030303] text-emerald-500 rounded-full flex items-center justify-center ring-2 ring-[#030303]">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">Summarize weekly report</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:11:32 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> Marketing Backlog
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item 2: Create task */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[32px] top-1 w-4 h-4 bg-[#030303] text-emerald-500 rounded-full flex items-center justify-center ring-2 ring-[#030303]">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">Create task</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:10:18 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> Sprint Planning
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item 3: API rate limit */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[32px] top-1 w-4 h-4 bg-[#030303] text-red-500 rounded-full flex items-center justify-center ring-2 ring-[#030303]">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-red-500/40 bg-red-500/10 flex items-center justify-center">
                                                        <X size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">API rate limit exceeded</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:09:45 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> Production API
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item 4: Comment on task */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[33px] top-1 w-[18px] h-[18px] bg-[#030303] text-amber-500 flex items-center justify-center ring-4 ring-[#030303]">
                                                    <AlertTriangle size={15} fill="currentColor" className="text-amber-500 stroke-[#030303]" strokeWidth={2} />
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">Comment on task</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:09:05 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> Project In Progress
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item 5: Assign task */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[32px] top-1 w-4 h-4 bg-[#030303] text-emerald-500 rounded-full flex items-center justify-center ring-2 ring-[#030303]">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">Assign task to teammate</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:07:52 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> Team Updates
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Item 6: Deploy */}
                                            <div className="relative flex flex-col gap-1">
                                                <div className="absolute -left-[32px] top-1 w-4 h-4 bg-[#030303] text-indigo-500 rounded-full flex items-center justify-center ring-2 ring-[#030303]">
                                                    <div className="w-3.5 h-3.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center">
                                                        <Check size={8} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <p className="text-zinc-300 text-base font-medium tracking-wide">Trigger deployment pipeline</p>
                                                <div className="flex items-center gap-1 text-zinc-600 text-sm">
                                                    <span>8:05:10 PM</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        in <List size={14} className="opacity-60" /> CI/CD
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Col 3: Reflection */}
                        <div className="p-8 lg:p-10 flex flex-col justify-start relative z-10">
                            <div className="min-h-[120px] lg:min-h-[140px] mb-8 lg:mb-12">
                                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Cognitive Frameworks</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Adaptive Agent Loops: Observe, Reason, Act, and Refine.
                                </p>
                            </div>

                            <div className="flex-1 flex items-center justify-center relative min-h-[240px] mt-auto">
                                <div className="relative w-52 h-52 lg:w-56 lg:h-56 flex items-center justify-center">
                                    {/* Cycle Diagram */}
                                    <svg className="absolute inset-0 w-full h-full animate-[spin_20s_linear_infinite]" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
                                        <path d="M 50 8 A 42 42 0 0 1 92 50" fill="none" stroke="#fff" strokeWidth="1" markerEnd="url(#arrow)" className="drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                                        <defs>
                                            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff" />
                                            </marker>
                                        </defs>
                                    </svg>

                                    {/* Cycle Labels */}
                                    <div className="absolute top-0 text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-widest bg-[#030303] px-2 -translate-y-1/2 flex flex-col items-center gap-1 z-10 animate-highlight-reflect">REFLECT <RefreshCcw size={14} /></div>
                                    <div className="absolute right-0 text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-widest bg-[#030303] py-2 translate-x-1/2 flex items-center gap-1.5 rotate-90 z-10 animate-highlight-think"><HelpCircle size={14} className="-rotate-90" /> THINK</div>
                                    <div className="absolute bottom-0 text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-widest bg-[#030303] px-2 translate-y-1/2 flex flex-col-reverse items-center gap-1 z-10 animate-highlight-plan">PLAN <LayoutGrid size={14} /></div>
                                    <div className="absolute left-0 text-[10px] lg:text-xs text-gray-500 font-bold uppercase tracking-widest bg-[#030303] py-2 -translate-x-1/2 flex items-center gap-1.5 -rotate-90 z-10 animate-highlight-execute">EXECUTE <Terminal size={14} className="rotate-90" /></div>
                                </div>
                            </div>
                        </div>


                        {/* Col 2: Zero data retention */}
                        <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-white/15 flex flex-col justify-start relative z-10 overflow-hidden group">
                            <div className="min-h-[120px] lg:min-h-[140px] mb-8 lg:mb-12">
                                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Zero-Retention Policy.<br />Immutable Data Privacy.</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Eliminating structural data leaks with privacy guardrails that surpass direct mainstream LLM deployments.
                                </p>
                            </div>

                            <div className="flex-1 flex items-center justify-center relative min-h-[220px] mt-auto">
                                {/* Code Background */}
                                <div className="absolute inset-[-50%] overflow-hidden font-mono text-[9px] text-[#222] group-hover:text-indigo-400/20 leading-tight opacity-40 group-hover:opacity-100 select-none flex flex-wrap break-all content-start transition-all duration-1000 [mask-image:radial-gradient(circle_at_center,white_20%,transparent_75%)] [-webkit-mask-image:radial-gradient(circle_at_center,white_20%,transparent_75%)]" aria-hidden="true">
                                    {`const process=(data)=>{const h=crypto.createHash('sha256');h.update(data);return h.digest('hex');};export const secure=async(req,res)=>{const token=req.headers.authorization;if(!token)return res.status(401).send('Unauthorized');try{const decoded=jwt.verify(token,process.env.JWT_SECRET);res.send({status:'ok',data:process(decoded.payload)});}catch(e){res.status(403).send('Forbidden');}};`.repeat(20)}
                                </div>

                                {/* Main Shield */}
                                <div className="relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                                    <Shield className="w-36 h-36 lg:w-40 lg:h-40 text-[#444] group-hover:text-indigo-400 fill-[#111] group-hover:fill-indigo-950/80 transition-all duration-500" strokeWidth={1.2} />

                                    {/* Inner Elements */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-3 group-hover:translate-y-0 transition-transform duration-500">
                                        <ChevronUp className="w-12 h-12 lg:w-14 lg:h-14 text-[#666] group-hover:text-indigo-300 transition-colors duration-500" strokeWidth={2.5} />
                                        <div className="w-4 h-1 lg:h-1.5 rounded-full bg-[#333] group-hover:bg-indigo-400 mt-1 transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(129,140,248,1)] group-hover:w-6"></div>
                                    </div>

                                    {/* Cyber Security details */}
                                    <div className="absolute inset-0 rounded-full border border-indigo-500/0 group-hover:border-indigo-500/30 scale-75 group-hover:scale-110 transition-all duration-700 opacity-0 group-hover:opacity-100 pointer-events-none"></div>
                                    <div className="absolute inset-[-15px] rounded-full border border-dashed border-cyan-500/0 group-hover:border-cyan-400/30 scale-50 group-hover:scale-100 transition-all duration-1000 opacity-0 group-hover:opacity-100 pointer-events-none animate-[spin_10s_linear_infinite]"></div>
                                </div>

                                {/* Floating particles/dots on hover */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                                    <div className="absolute top-[10%] left-[10%] w-1 h-1 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                                    <div className="absolute bottom-[15%] right-[10%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                                    <div className="absolute top-[25%] right-[5%] w-1 h-1 bg-indigo-300 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }}></div>
                                    <div className="absolute bottom-[5%] left-[15%] w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1.5s' }}></div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div >
            </div >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </section >
    );
};