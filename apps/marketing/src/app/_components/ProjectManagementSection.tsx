"use client";

import React, { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import {
    Layout, Users, Bot, Zap, Database,
    MessageSquare, FolderKanban, BarChart3,
    Plus, CheckCircle2, Clock, List, Kanban, Calendar, FileText, LayoutDashboard, Settings, MoreHorizontal, MousePointer2,
    Sparkles, Mail, PenTool, Github, Monitor, Box, Cpu, Figma, Slack, FileSpreadsheet, Cloud
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- FAKE MOUSE CURSOR ---
const Cursor = ({ controls }: { controls: any }) => (
    <motion.div
        animate={controls}
        initial={{ x: 500, y: 400, opacity: 0 }}
        className="absolute z-50 pointer-events-none drop-shadow-2xl"
    >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="fill-black/80 drop-shadow-md">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
        </svg>
    </motion.div>
);

// --- MOCK REAL UI ---
const RealAppDemo = () => {
    const cursorControls = useAnimation();
    const [activeTab, setActiveTab] = useState('board');

    const initialTasks = [
        { id: 't1', title: 'Update visuals for landing page', status: 'todo', tag: 'Design', tagColor: 'indigo', time: '2d' },
        { id: 't2', title: 'Draft email sequence', status: 'todo', tag: 'Copy', tagColor: 'orange' },
        { id: 't7', title: 'Create marketing assets', status: 'todo', tag: 'Design', tagColor: 'indigo' },
        { id: 't5', title: 'Review Q4 Metrics', status: 'todo', tag: 'Analytics', tagColor: 'purple' },

        { id: 't3', title: 'Implement auth flow', status: 'in-progress', tag: 'Dev', tagColor: 'blue', isAgent: true },
        { id: 't6', title: 'Optimize DB queries', status: 'in-progress', tag: 'Backend', tagColor: 'emerald', isAgent: true },

        { id: 't4', title: 'Setup Repo', status: 'done', tag: '', tagColor: '' },
        { id: 't8', title: 'Fix mobile nav bug', status: 'done', tag: 'Bug', tagColor: 'red' },
    ];

    const [tasks, setTasks] = useState(initialTasks);

    // Animation Sequence
    useEffect(() => {
        let isMounted = true;

        const runSequence = async () => {
            await new Promise(r => setTimeout(r, 1000)); // Initial delay

            while (isMounted) {
                // 1. Move to "List" tab and click
                if (!isMounted) break;
                await cursorControls.start({ x: 280, y: 30, opacity: 1, transition: { duration: 1.2, ease: "easeInOut" } });
                await cursorControls.start({ scale: 0.9, transition: { duration: 0.1 } });
                setActiveTab('list');
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                await new Promise(r => setTimeout(r, 1500));

                // 2. Move to a task in the list and click "Complete"
                if (!isMounted) break;
                await cursorControls.start({ x: 380, y: 145, transition: { duration: 1, ease: "easeInOut" } });
                await cursorControls.start({ scale: 0.9, transition: { duration: 0.1 } });
                setTasks(prev => prev.map(t => t.id === 't1' ? { ...t, status: 'done' } : t));
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                await new Promise(r => setTimeout(r, 1500));

                // 3. Move back to "Board" tab
                if (!isMounted) break;
                await cursorControls.start({ x: 360, y: 30, transition: { duration: 1, ease: "easeInOut" } });
                await cursorControls.start({ scale: 0.9, transition: { duration: 0.1 } });
                setActiveTab('board');
                await cursorControls.start({ scale: 1, transition: { duration: 0.1 } });
                await new Promise(r => setTimeout(r, 2000));

                // Reset for next loop
                if (!isMounted) break;
                await cursorControls.start({ opacity: 0, transition: { duration: 0.5 } });
                setTasks(initialTasks);
                await cursorControls.start({ x: 500, y: 400 });
                await new Promise(r => setTimeout(r, 1000));
            }
        };

        runSequence();

        return () => { isMounted = false; };
    }, [cursorControls]);

    const renderCard = (task: any) => (
        <motion.div key={task.id} layout layoutId={`card-${task.id}`} className="p-3 bg-white border border-gray-200 rounded-lg mb-3 shadow-sm hover:shadow-md transition-shadow">
            {task.status !== 'done' && (
                <div className="flex items-center justify-between mb-2">
                    {task.tag && <span className={`text-[10px] px-1.5 py-0.5 rounded bg-${task.tagColor}-100 text-${task.tagColor}-700 border border-${task.tagColor}-200`}>{task.tag}</span>}
                    {task.isAgent && (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Bot size={12} />
                        </div>
                    )}
                </div>
            )}
            <div className={cn("text-sm font-medium text-gray-800", task.status === 'done' && "line-through text-gray-400 flex items-center gap-2")}>
                {task.status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                {task.title}
            </div>
            {task.isAgent && task.status === 'in-progress' && (
                <div className="mt-2 p-2 rounded bg-gray-50 text-[10px] text-gray-500 font-mono leading-relaxed border border-gray-100">
                    &gt; AI analyzing repo...
                </div>
            )}
        </motion.div>
    );

    const renderListItem = (task: any) => (
        <motion.div layout layoutId={`list-${task.id}`} className="flex items-center gap-4 py-3 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
            <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-emerald-500 cursor-pointer">
                {task.status === 'done' && <CheckCircle2 size={12} />}
            </div>
            <div className={cn("text-sm font-medium flex-1", task.status === 'done' ? "line-through text-gray-400" : "text-gray-800")}>
                {task.title}
            </div>
            {task.tag && (
                <div className={`text-[10px] px-2 py-0.5 rounded bg-${task.tagColor}-100 text-${task.tagColor}-700 w-24 text-center font-medium`}>
                    {task.tag}
                </div>
            )}
            <div className="text-xs text-gray-500 w-24 font-medium">
                {task.status === 'todo' ? 'To Do' : task.status === 'in-progress' ? 'In Progress' : 'Done'}
            </div>
        </motion.div>
    );

    return (
        <div className="flex-1 flex overflow-hidden relative bg-white rounded-b-3xl">
            <Cursor controls={cursorControls} />

            {/* Sidebar matching real UI */}
            <div className="w-16 lg:w-56 flex-shrink-0 border-r border-gray-200 flex flex-col justify-between py-4 bg-gray-50">
                <div className="flex flex-col gap-4 px-3">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shadow-sm">
                            <Layout size={14} className="text-white" />
                        </div>
                        <span className="hidden lg:block font-bold text-gray-900 text-sm tracking-wide">Workspace</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        {[
                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                            { id: 'personal', label: 'Personal', icon: Users },
                            { id: 'spaces', label: 'Spaces', icon: FolderKanban },
                            { id: 'projects', label: 'Projects', icon: Layout },
                            { id: 'teams', label: 'Teams', icon: Users },
                            { id: 'docs', label: 'Docs', icon: FileText },
                            { id: 'chats', label: 'Chats', icon: MessageSquare },
                            { id: 'ai-chat', label: 'AI Chat', icon: Sparkles },
                        ].map((item, idx) => (
                            <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors font-medium ${item.id === 'projects' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                                <item.icon size={16} />
                                <span className="hidden lg:block text-xs">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Dashboard Header Mock */}
                <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer transition-colors">
                            <Settings size={16} />
                        </div>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors flex items-center gap-2">
                                <Layout size={14} /> Agentflox Workspace
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className="font-semibold text-gray-900 flex items-center gap-2">
                                <FolderKanban size={14} className="text-indigo-600" /> Q4 Product Launch
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 hidden sm:flex">
                        <div className="px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs text-gray-600 font-medium cursor-pointer transition-colors flex items-center gap-2 shadow-sm">
                            <Sparkles size={14} className="text-indigo-500" /> Ask AI
                        </div>
                        <div className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-medium cursor-pointer transition-colors shadow-sm">
                            Share
                        </div>
                    </div>
                </div>

                {/* Tabs Header matching Real UI */}
                <div className="h-12 border-b border-gray-200 bg-gray-50/50 flex items-center px-4 overflow-hidden flex-shrink-0">
                    <div className="flex items-center gap-1">
                        {[
                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                            { id: 'list', label: 'List', icon: List },
                            { id: 'board', label: 'Board', icon: Kanban },
                            { id: 'calendar', label: 'Calendar', icon: Calendar },
                        ].map((tab) => (
                            <div key={tab.id} className={cn(
                                "flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer relative",
                                activeTab === tab.id ? "text-indigo-700 bg-white shadow-sm border border-gray-200/60" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            )}>
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" style={{ bottom: "-8px" }} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="ml-2 w-px h-4 bg-gray-200" />
                    <div className="ml-2 px-2 py-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer transition-colors">
                        <Plus size={14} />
                    </div>
                </div>

                {/* View Content & Chatbot Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* View Content (Board/List) */}
                    <div className="flex-1 overflow-hidden relative bg-gray-50/30">
                        <AnimatePresence mode="wait">
                            {activeTab === 'board' ? (
                                <motion.div
                                    key="board"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute inset-0 p-6 flex gap-6 overflow-x-auto scrollbar-hide"
                                >
                                    {/* Board Columns */}
                                    {['todo', 'in-progress', 'done'].map(status => (
                                        <div key={status} className="w-72 flex-shrink-0 flex flex-col">
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{status.replace('-', ' ')}</span>
                                                <span className="text-[10px] font-medium text-gray-600 bg-gray-200/70 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status === status).length}</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 pb-10 scrollbar-hide">
                                                {tasks.filter(t => t.status === status).map(task => renderCard(task))}
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : activeTab === 'list' ? (
                                <motion.div
                                    key="list"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <div className="flex items-center gap-4 py-2 px-4 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <div className="w-4" />
                                        <div className="flex-1">Task Name</div>
                                        <div className="w-24 text-center">Tag</div>
                                        <div className="w-24">Status</div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                                        {tasks.map(task => <React.Fragment key={task.id}>{renderListItem(task)}</React.Fragment>)}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="other" className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm">
                                    View content for {activeTab}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* AI Chatbot Sidebar */}
                    <div className="hidden lg:flex w-72 flex-shrink-0 border-l border-gray-200 bg-white flex-col z-10 shadow-sm">
                        <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-2 bg-gray-50">
                            <Sparkles size={14} className="text-indigo-600" />
                            <span className="text-xs font-bold text-gray-800">AI Assistant</span>
                        </div>
                        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto text-sm bg-gray-50/50 scrollbar-hide">
                            <div className="bg-white rounded-2xl rounded-tl-none p-3 text-xs text-gray-700 w-11/12 border border-gray-200 shadow-sm font-medium">
                                How can I help with the Q4 Product Launch?
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-none p-3 text-xs text-indigo-800 w-11/12 self-end shadow-sm font-medium">
                                Summarize the remaining 'To Do' tasks.
                            </div>
                            <div className="bg-white rounded-2xl rounded-tl-none p-3 text-xs text-gray-700 w-11/12 border border-gray-200 shadow-sm leading-relaxed font-medium">
                                You have 4 tasks left. The most urgent is <span className="text-indigo-600 font-bold">"Update visuals for landing page"</span>. Should I auto-assign this to the design team?
                            </div>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-none p-3 text-xs text-indigo-800 w-11/12 self-end shadow-sm font-medium">
                                Yes, please.
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-2 px-1 font-semibold">
                                <Bot size={12} className="text-indigo-500 animate-pulse" />
                                <span>Agentflox AI is assigning tasks...</span>
                            </div>
                        </div>
                        <div className="p-3 border-t border-gray-200 bg-white">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-inner">
                                <span className="text-xs text-gray-400 font-medium">Ask AI anything...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProjectManagementSection = () => {
    return (
        <section className="relative w-full pt-12 pb-24 bg-[#050505] overflow-hidden border-b border-white/5">
            {/* Top Gradient Divider */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">
                {/* Header */}
                <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] text-[#8A8F98] font-medium leading-[1.25] tracking-tight">
                        <span className="font-bold text-white">See work your way.</span> Manage your work at different levels based on your need. Whether it's a personal to-do list or an entire team's project, Agentflox adapts.
                    </h2>
                </div>

                {/* Chips and Cards Row */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-12">
                    {/* Left side: Chips */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                        {['Personal', 'Team', 'Project', 'Space', 'Workspace'].map((chip) => (
                            <div key={chip} className="px-5 py-2.5 rounded-full border border-white/10 bg-[#0A0A0A] text-gray-400 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                                {chip}
                            </div>
                        ))}
                    </div>

                    {/* Right side: Cards */}
                    <div className="flex items-center gap-4">
                        <div className="px-5 py-4 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-xl flex flex-col gap-1 items-start hover:border-white/20 transition-all">
                            <div className="text-3xl font-bold text-white mb-1">20+</div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Custom Views</div>
                        </div>
                        <div className="px-5 py-4 rounded-2xl bg-[#0A0A0A] border border-white/10 shadow-xl flex flex-col gap-1 items-start hover:border-white/20 transition-all">
                            <div className="text-3xl font-bold text-indigo-400 mb-1">250+</div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Features</div>
                        </div>
                    </div>
                </div>

                {/* Main Bento Box - Automated Video Demo */}
                <div className="rounded-3xl border border-white/10 bg-[#0A0A0A] overflow-hidden min-h-[500px] shadow-2xl flex flex-col relative z-20">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#080808]">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 ">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                            </div>
                        </div>
                        {/* Removed the "Auto Demo Running" text here */}
                    </div>

                    <RealAppDemo />
                </div>

                {/* Feature Cards Below Demo */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 relative z-20">
                    {/* Column 1 */}
                    <div className="flex flex-col items-center text-center px-8 border-b md:border-b-0 md:border-r border-white/10 pb-12 md:pb-8">
                        {/* Graphic */}
                        <div className="h-48 mb-4 flex items-center justify-center w-full relative">
                            {/* Concentric rings */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[296px] h-[188px] rounded-full p-[1.5px] bg-gradient-to-tr from-white/[0.02] via-white/[0.08] to-white/[0.02] absolute flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                        <div className="w-[256px] h-[148px] rounded-full p-[1.5px] bg-gradient-to-tr from-white/[0.04] via-white/[0.15] to-white/[0.04] flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.04)]">
                                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                                <div className="w-[216px] h-[108px] rounded-full p-[1.5px] bg-gradient-to-tr from-white/[0.06] via-white/[0.3] to-white/[0.06] flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.06)]">
                                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                                        <div className="w-[176px] h-[68px] rounded-full p-[1.5px] bg-gradient-to-tr from-white/[0.08] via-white/[0.5] to-white/[0.08] shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                                            <div className="w-full h-full rounded-full bg-black" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 px-6 py-3.5 bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.6)] rounded-full flex items-center gap-2.5">
                                <Sparkles size={16} className="text-gray-300 drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />
                                <span className="text-base font-medium text-white tracking-wide">Custom AI</span>
                            </div>
                        </div>
                        <h3 className="text-white font-bold mb-2">Your AI co-workers</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Intelligent members support you and<br />your team.</p>
                    </div>

                    {/* Column 2 */}
                    <div className="flex flex-col items-center text-center px-8 border-b md:border-b-0 md:border-r border-white/10 py-12 md:pb-8 md:pt-0">
                        <div className="h-48 mb-4 flex items-center justify-center w-full">
                            <div className="relative">
                                {/* Left fade */}
                                <div className="absolute left-0 top-0 h-full w-14 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
                                {/* Right fade */}
                                <div className="absolute right-0 top-0 h-full w-14 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
                                <div className="grid grid-cols-4 gap-3 opacity-90">
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/Google_Drive_Logo_512px.webp" alt="Drive" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/Gmail_Logo_512px.webp" alt="Gmail" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/figma-icon.webp" alt="Figma" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/github_logo_icon_229278.webp" alt="GitHub" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/Google_Sheets_Logo_512px.png" alt="Sheets" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/Google_Docs_Logo_512px.webp" alt="Docs" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/2111615.png" alt="Slack" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                    <div className="w-14 h-14 rounded-[12px] bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center"><img src="/images/apps/Google_Calendar_Logo_512px.png" alt="Calendar" className="w-7 h-7 object-contain drop-shadow-md" /></div>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-white font-bold mb-2">Connected to 50+ apps</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Built-in integrations to 50+ tools</p>
                    </div>

                    {/* Column 3 */}
                    <div className="flex flex-col items-center text-center px-8 pt-12 md:pt-0 md:pb-8">
                        <div className="h-48 mb-4 flex items-center justify-center w-full relative">
                            {/* Stacked AI avatars */}
                            <div className="flex items-center justify-center relative w-full h-full">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] absolute left-1/2 -ml-[104px] flex items-center justify-center z-0"><img src="/images/apps/deepseek.png" alt="DeepSeek" className="w-6 h-6 object-contain" /></div>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] absolute left-1/2 -ml-[80px] flex items-center justify-center z-10"><img src="/images/apps/chatgpt_PNG16.png" alt="ChatGPT" className="w-8 h-8 object-contain" /></div>
                                <div className="w-[76px] h-[76px] rounded-full bg-gradient-to-b from-[#333] to-[#111] border border-[#555] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.7)] relative z-20 flex items-center justify-center"><img src="/images/apps/claude-ai-icon.webp" alt="Claude" className="w-10 h-10 object-contain drop-shadow-lg" /></div>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] absolute right-1/2 -mr-[80px] flex items-center justify-center z-10"><img src="/images/apps/google-gemini-icon.webp" alt="Gemini" className="w-8 h-8 object-contain" /></div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#333] to-[#0a0a0a] border border-[#444] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)] absolute right-1/2 -mr-[104px] flex items-center justify-center z-0"><img src="/images/apps/grok-ai-icon.webp" alt="Grok" className="w-6 h-6 object-contain" /></div>
                            </div>
                        </div>
                        <h3 className="text-white font-bold mb-2">Every AI</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">ChatGPT, Claude, Gemini — unlimited.</p>
                    </div>
                </div>

                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
        </section>
    );
};
