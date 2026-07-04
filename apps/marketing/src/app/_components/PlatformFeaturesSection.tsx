"use client";

import React from "react";
import {
    FileText, Layers, Box, UserCheck, Globe, MessageSquare, StickyNote, MessagesSquare,
    Sparkles, Wrench, Bell, Users, Bot, Mail, Hash, Network, CheckSquare,
    FileSpreadsheet, BarChart3, ScrollText, User, ShieldCheck, Layout, Grid,
    Zap, Cpu, Database, Share2, Workflow, Command, Bug, Calendar,
    Target, Code, PieChart, MessageCircle, Flag, Clock, Tag, PhoneCall, PenTool, Map, Inbox, Shield, UserPlus, Key, Briefcase, Link, Timer
} from "lucide-react";
import { motion } from "framer-motion";

// Exactly 44 small features to fill the 10x6 grid (leaving a 4x4 center hole for big cards)
const smallFeatures = [
    // ROW 1
    { name: "Spreadsheet", icon: FileSpreadsheet, pos: "lg:col-start-1 lg:row-start-1" },
    { name: "Timeline", icon: Calendar, pos: "lg:col-start-2 lg:row-start-1" },
    { name: "Gantt Chart", icon: BarChart3, pos: "lg:col-start-3 lg:row-start-1" },
    { name: "Workload", icon: Users, pos: "lg:col-start-4 lg:row-start-1" },
    { name: "Time Estimates", icon: Clock, pos: "lg:col-start-5 lg:row-start-1" },
    { name: "Budget", icon: Database, pos: "lg:col-start-6 lg:row-start-1" },
    { name: "Resources", icon: Layers, pos: "lg:col-start-7 lg:row-start-1" },
    { name: "Mind Map", icon: Network, pos: "lg:col-start-8 lg:row-start-1" },
    { name: "Sprint", icon: Zap, pos: "lg:col-start-9 lg:row-start-1" },
    { name: "Goals", icon: Target, pos: "lg:col-start-10 lg:row-start-1" },

    // ROW 2 (Left 1-3, Right 8-10)
    { name: "Checklists", icon: CheckSquare, pos: "lg:col-start-1 lg:row-start-2" },
    { name: "Custom Fields", icon: Box, pos: "lg:col-start-2 lg:row-start-2" },
    { name: "Channels", icon: Hash, pos: "lg:col-start-3 lg:row-start-2" },
    { name: "Templates", icon: FileText, pos: "lg:col-start-8 lg:row-start-2" },
    { name: "Teams", icon: Users, pos: "lg:col-start-9 lg:row-start-2" },
    { name: "Tools", icon: Wrench, pos: "lg:col-start-10 lg:row-start-2" },

    // ROW 3
    { name: "Messages", icon: MessageSquare, pos: "lg:col-start-1 lg:row-start-3" },
    { name: "Integrations", icon: Link, pos: "lg:col-start-2 lg:row-start-3" },
    { name: "Reports", icon: PieChart, pos: "lg:col-start-3 lg:row-start-3" },
    { name: "Analytics", icon: BarChart3, pos: "lg:col-start-8 lg:row-start-3" },
    { name: "Automations", icon: Cpu, pos: "lg:col-start-9 lg:row-start-3" },
    { name: "Forms", icon: FileText, pos: "lg:col-start-10 lg:row-start-3" },

    // ROW 4
    { name: "Talents", icon: UserCheck, pos: "lg:col-start-1 lg:row-start-4" },
    { name: "Community", icon: Globe, pos: "lg:col-start-2 lg:row-start-4" },
    { name: "Docs", icon: ScrollText, pos: "lg:col-start-3 lg:row-start-4" },
    { name: "Realtime", icon: Zap, pos: "lg:col-start-8 lg:row-start-4" },
    { name: "Bugs", icon: Bug, pos: "lg:col-start-9 lg:row-start-4" },
    { name: "API Calls", icon: Code, pos: "lg:col-start-10 lg:row-start-4" },

    // ROW 5
    { name: "Reminders", icon: Bell, pos: "lg:col-start-1 lg:row-start-5" },
    { name: "AI Q&A", icon: MessageCircle, pos: "lg:col-start-2 lg:row-start-5" },
    { name: "Priorities", icon: Flag, pos: "lg:col-start-3 lg:row-start-5" },
    { name: "Emails", icon: Mail, pos: "lg:col-start-8 lg:row-start-5" },
    { name: "Dashboards", icon: Layout, pos: "lg:col-start-9 lg:row-start-5" },
    { name: "Time Tracking", icon: Timer, pos: "lg:col-start-10 lg:row-start-5" },

    // ROW 6
    { name: "Tags", icon: Tag, pos: "lg:col-start-1 lg:row-start-6" },
    { name: "24/7 Support", icon: PhoneCall, pos: "lg:col-start-2 lg:row-start-6" },
    { name: "Scheduling", icon: Calendar, pos: "lg:col-start-3 lg:row-start-6" },
    { name: "Whiteboards", icon: PenTool, pos: "lg:col-start-4 lg:row-start-6" },
    { name: "Roadmaps", icon: Map, pos: "lg:col-start-5 lg:row-start-6" },
    { name: "Inbox", icon: Inbox, pos: "lg:col-start-6 lg:row-start-6" },
    { name: "Permissions", icon: Shield, pos: "lg:col-start-7 lg:row-start-6" },
    { name: "Guests", icon: UserPlus, pos: "lg:col-start-8 lg:row-start-6" },
    { name: "SSO", icon: Key, pos: "lg:col-start-9 lg:row-start-6" },
    { name: "Portfolios", icon: Briefcase, pos: "lg:col-start-10 lg:row-start-6" },
];

const WorkManagementUI = () => (
    <div className="w-full h-full relative flex items-end justify-center pb-0">
        <div className="w-[80%] h-[80%] bg-[#1A1A1A] rounded-t-xl border-t border-l border-r border-white/20 flex flex-col gap-2 p-3 shadow-2xl relative translate-y-6 group-hover:translate-y-2 transition-transform duration-500">
            <div className="flex gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            </div>
            <div className="w-full h-8 rounded bg-white/10 flex items-center px-2 gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-400/50" />
                <div className="flex-1 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="w-full h-8 rounded bg-white/10 flex items-center px-2 gap-2">
                <div className="w-3 h-3 rounded-sm bg-white/20" />
                <div className="w-2/3 h-1.5 rounded-full bg-white/20" />
            </div>
        </div>
    </div>
);

const AIAgentUI = () => (
    <div className="w-full h-full relative flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-2xl rounded-tr-none bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-200 font-medium transform rotate-[5deg] group-hover:rotate-0 group-hover:-translate-y-1 transition-all duration-500 shadow-xl">
            Auto-assign tasks?
        </div>
        <div className="w-[85%] bg-[#1A1A1A] rounded-xl border border-white/20 p-3 shadow-2xl relative z-10 translate-y-3 group-hover:translate-y-0 transition-transform duration-500 flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-2">
                <Bot size={16} className="text-indigo-400 group-hover:animate-pulse" />
                <div className="w-20 h-1.5 rounded-full bg-indigo-400/60" />
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/20" />
            <div className="w-3/4 h-1.5 rounded-full bg-white/20" />
        </div>
    </div>
);

const MarketplaceUI = () => (
    <div className="w-full h-full relative flex items-center justify-center">
        <div className="grid grid-cols-2 gap-3 w-[75%] relative z-10 group-hover:scale-[1.02] transition-transform duration-500">
            <div className="aspect-square rounded-lg bg-blue-500/10 border border-blue-400/30 p-2.5 flex flex-col gap-2">
                <div className="w-5 h-5 rounded bg-blue-400/40 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-white/20" />
                <div className="w-1/2 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="aspect-square rounded-lg bg-[#1A1A1A] border border-white/20 p-2.5 flex flex-col gap-2 translate-y-3">
                <div className="w-5 h-5 rounded bg-white/20 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-white/20" />
                <div className="w-2/3 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="aspect-square rounded-lg bg-[#1A1A1A] border border-white/20 p-2.5 flex flex-col gap-2 -translate-y-1">
                <div className="w-5 h-5 rounded bg-white/20 mb-1" />
                <div className="w-4/5 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="aspect-square rounded-lg bg-cyan-500/10 border border-cyan-400/30 p-2.5 flex flex-col gap-2 translate-y-2">
                <div className="w-5 h-5 rounded bg-cyan-400/40 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-white/20" />
            </div>
        </div>
    </div>
);

const AIWorkflowUI = () => (
    <div className="w-full h-full relative flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 30,50 C 45,50 45,30 65,30" stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" fill="none" />
            <path d="M 30,50 C 45,50 45,70 65,70" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" fill="none" />
        </svg>
        <div className="absolute left-[20%] w-8 h-8 rounded-lg bg-[#1A1A1A] border border-white/20 flex items-center justify-center z-10 group-hover:border-orange-400 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all duration-500">
            <Bot size={14} className="text-gray-200" />
        </div>
        <div className="absolute right-[25%] top-[20%] w-6 h-6 rounded-md bg-[#1A1A1A] border border-white/20 z-10 group-hover:border-red-400 transition-all duration-500" />
        <div className="absolute right-[25%] bottom-[20%] w-6 h-6 rounded-md bg-[#1A1A1A] border border-white/20 z-10 group-hover:border-orange-400 transition-all duration-500" />
    </div>
);

const BigCard = ({ title, icon: Icon, hoverColor, posClasses, children }: any) => (
    // Spans 2 columns and 2 rows, perfectly occupying a 4-cell block
    <div className={`lg:col-span-2 lg:row-span-2 ${posClasses} relative group rounded-3xl border border-white/10 bg-[#050505] transition-all duration-500 cursor-default flex flex-col shadow-2xl h-full w-full`}>
        <div className={`absolute -inset-[1px] rounded-[24px] bg-gradient-to-br ${hoverColor} opacity-0 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none -z-10`} />
        <div className={`absolute inset-0 bg-gradient-to-br ${hoverColor} opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 rounded-3xl pointer-events-none`} />
        <div className="flex-1 w-full relative overflow-hidden rounded-t-3xl bg-white/[0.01]">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505] z-20 pointer-events-none" />
            <div className="absolute inset-0 z-10">
                {children}
            </div>
        </div>
        <div className="h-14 shrink-0 w-full flex items-center justify-center gap-2.5 relative z-30 border-t border-white/10 bg-[#080808]/80 backdrop-blur-md rounded-b-3xl">
            <Icon size={16} strokeWidth={2} className="text-gray-400 group-hover:text-white transition-colors duration-500 ease-out" />
            <h3 className="text-xs md:text-sm font-bold tracking-widest uppercase text-gray-400 group-hover:text-white transition-colors drop-shadow-md">{title}</h3>
        </div>
    </div>
);

const SmallCard = ({ item }: { item: typeof smallFeatures[0] }) => {
    const Icon = item.icon;
    return (
        <div className={`aspect-square lg:col-span-1 lg:row-span-1 ${item.pos} rounded-2xl border border-white/10 bg-[#050505] flex flex-col items-center justify-center gap-2 relative group overflow-hidden hover:border-white/30 transition-colors duration-300 cursor-default p-2`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Icon size={20} strokeWidth={1.5} className="text-gray-400 group-hover:text-white transition-colors duration-300 relative z-10" />
            <span className="text-[9px] md:text-[10px] font-semibold text-gray-400 group-hover:text-gray-200 transition-colors duration-300 tracking-wider uppercase text-center px-1">
                {item.name}
            </span>
        </div>
    );
};

export const PlatformFeaturesSection = () => {
    return (
        <section className="relative w-full pt-12 pb-12 bg-[#000000] overflow-hidden border-b border-white/5 flex flex-col justify-center">

            {/* Text Content - Attio Style Header */}
            <div className="relative z-20 container mx-auto px-6 lg:px-12 mb-20 shrink-0 max-w-[1400px]">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight text-[#8A8F98] font-medium">
                        <span className="text-white font-semibold">Unified system.</span> Agentflox provides the complete platform for users to manage their work and build AI Agent and orchestrate their entire AI workforce in one environment.
                    </h2>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-16 max-w-3xl"
                >
                    {/* Stat 1 */}
                    <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                        <div className="text-3xl md:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-none">1000+</div>
                        <div className="text-sm font-medium text-[#8A8F98]">Individuals and teams</div>
                    </div>
                    {/* Stat 2 */}
                    <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                        <div className="text-3xl md:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-none">5000+</div>
                        <div className="text-sm font-medium text-[#8A8F98]">Workspace, spaces and projects</div>
                    </div>
                    {/* Stat 3 */}
                    <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                        <div className="text-3xl md:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-none">500+</div>
                        <div className="text-sm font-medium text-[#8A8F98]">Agents built per day</div>
                    </div>
                    {/* Stat 4 */}
                    <div className="border-l border-white/15 pl-5 flex flex-col gap-1.5 py-0.5">
                        <div className="text-3xl md:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-none">10000+</div>
                        <div className="text-sm font-medium text-[#8A8F98]">Agent executions per week</div>
                    </div>
                </motion.div>
            </div>

            {/* Dense Bento Grid Layout */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center pb-8">
                <div className="[mask-image:radial-gradient(ellipse_95%_95%_at_50%_50%,#000_20%,transparent_90%)] w-full flex justify-center">
                    <div className="container px-2 sm:px-4 max-w-[1400px]">
                        {/* 10 columns, 6 rows of exact squares */}
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 lg:gap-3 w-full">

                            {/* THE 4 BIG CENTER CARDS */}
                            <BigCard
                                title="AI Agent"
                                icon={Bot}
                                hoverColor="from-indigo-600 to-purple-600"
                                posClasses="lg:col-start-4 lg:row-start-2"
                            >
                                <AIAgentUI />
                            </BigCard>

                            <BigCard
                                title="Marketplace"
                                icon={Globe}
                                hoverColor="from-blue-600 to-cyan-500"
                                posClasses="lg:col-start-6 lg:row-start-2"
                            >
                                <MarketplaceUI />
                            </BigCard>

                            <BigCard
                                title="Work Management"
                                icon={Layout}
                                hoverColor="from-emerald-600 to-teal-500"
                                posClasses="lg:col-start-4 lg:row-start-4"
                            >
                                <WorkManagementUI />
                            </BigCard>

                            <BigCard
                                title="AI Workflow"
                                icon={Workflow}
                                hoverColor="from-orange-600 to-red-500"
                                posClasses="lg:col-start-6 lg:row-start-4"
                            >
                                <AIWorkflowUI />
                            </BigCard>

                            {/* THE SURROUNDING SMALL CARDS (Full Perimeter) */}
                            {smallFeatures.map((item, idx) => (
                                <SmallCard key={idx} item={item} />
                            ))}

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
