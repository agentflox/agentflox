"use client";

import React, { useState } from "react";
import {
    FileText, Layers, Box, UserCheck, Globe, MessageSquare,
    Wrench, Bell, Users, Bot, Mail, Hash, Network, CheckSquare,
    FileSpreadsheet, BarChart3, ScrollText, ShieldCheck, Layout,
    Zap, Cpu, Database, Share2, Workflow, Command, Bug, Calendar,
    Target, Code, PieChart, MessageCircle, Flag, Clock, Tag, PhoneCall,
    PenTool, Map, Inbox, Shield, UserPlus, Key, Briefcase, Link, Timer
} from "lucide-react";
import { motion } from "framer-motion";

// Features mapped to their geographical "Hub" for the connected interactive effect.
// Reduced cognitive overload by conceptually grouping features.
const smallFeatures = [
    // --- AI AGENT HUB (Top-Left / Purple) ---
    { name: "AI Q&A", icon: MessageCircle, pos: "lg:col-start-1 lg:row-start-1", hub: "agent" },
    { name: "Context Memory", icon: Database, pos: "lg:col-start-2 lg:row-start-1", hub: "agent" },
    { name: "Commands", icon: Command, pos: "lg:col-start-3 lg:row-start-1", hub: "agent" },
    { name: "Live Arch", icon: Layers, pos: "lg:col-start-4 lg:row-start-1", hub: "agent" },
    { name: "Model Select", icon: Cpu, pos: "lg:col-start-5 lg:row-start-1", hub: "agent" },
    { name: "Agent Personas", icon: UserCheck, pos: "lg:col-start-1 lg:row-start-2", hub: "agent" },
    { name: "Guardrails", icon: ShieldCheck, pos: "lg:col-start-2 lg:row-start-2", hub: "agent" },
    { name: "Prompts", icon: Hash, pos: "lg:col-start-3 lg:row-start-2", hub: "agent" },
    { name: "Live Chat", icon: MessageSquare, pos: "lg:col-start-1 lg:row-start-3", hub: "agent" },
    { name: "Custom Skills", icon: Zap, pos: "lg:col-start-2 lg:row-start-3", hub: "agent" },
    { name: "Data Sync", icon: Share2, pos: "lg:col-start-3 lg:row-start-3", hub: "agent" },

    // --- MARKETPLACE HUB (Top-Right / Cyan) ---
    { name: "Global Talent", icon: Globe, pos: "lg:col-start-6 lg:row-start-1", hub: "marketplace" },
    { name: "Freelancers", icon: Users, pos: "lg:col-start-7 lg:row-start-1", hub: "marketplace" },
    { name: "Agencies", icon: Briefcase, pos: "lg:col-start-8 lg:row-start-1", hub: "marketplace" },
    { name: "Community", icon: Users, pos: "lg:col-start-9 lg:row-start-1", hub: "marketplace" },
    { name: "Portfolios", icon: Layout, pos: "lg:col-start-10 lg:row-start-1", hub: "marketplace" },
    { name: "Templates", icon: FileText, pos: "lg:col-start-8 lg:row-start-2", hub: "marketplace" },
    { name: "Partner Teams", icon: Users, pos: "lg:col-start-9 lg:row-start-2", hub: "marketplace" },
    { name: "Plugin Tools", icon: Wrench, pos: "lg:col-start-10 lg:row-start-2", hub: "marketplace" },
    { name: "Integrations", icon: Link, pos: "lg:col-start-8 lg:row-start-3", hub: "marketplace" },
    { name: "Open APIs", icon: Code, pos: "lg:col-start-9 lg:row-start-3", hub: "marketplace" },
    { name: "App Directory", icon: Box, pos: "lg:col-start-10 lg:row-start-3", hub: "marketplace" },

    // --- WORK MANAGEMENT HUB (Bottom-Left / Emerald) ---
    { name: "Unified Projects", icon: FileSpreadsheet, pos: "lg:col-start-1 lg:row-start-4", hub: "work" },
    { name: "Task Checklists", icon: CheckSquare, pos: "lg:col-start-2 lg:row-start-4", hub: "work" },
    { name: "Workload", icon: BarChart3, pos: "lg:col-start-3 lg:row-start-4", hub: "work" },
    { name: "Sprint Plan", icon: Target, pos: "lg:col-start-1 lg:row-start-5", hub: "work" },
    { name: "Time Tracking", icon: Timer, pos: "lg:col-start-2 lg:row-start-5", hub: "work" },
    { name: "Budgeting", icon: PieChart, pos: "lg:col-start-3 lg:row-start-5", hub: "work" },
    { name: "Docs Base", icon: ScrollText, pos: "lg:col-start-1 lg:row-start-6", hub: "work" },
    { name: "Priorities", icon: Flag, pos: "lg:col-start-2 lg:row-start-6", hub: "work" },
    { name: "Insight Hub", icon: Bell, pos: "lg:col-start-3 lg:row-start-6", hub: "work" },
    { name: "Whiteboards", icon: PenTool, pos: "lg:col-start-4 lg:row-start-6", hub: "work" },
    { name: "Roadmaps", icon: Map, pos: "lg:col-start-5 lg:row-start-6", hub: "work" },

    // --- AI WORKFLOW HUB (Bottom-Right / Orange) ---
    { name: "Automations", icon: Workflow, pos: "lg:col-start-8 lg:row-start-4", hub: "workflow" },
    { name: "Dynamic Flow", icon: Network, pos: "lg:col-start-9 lg:row-start-4", hub: "workflow" },
    { name: "Branching", icon: Network, pos: "lg:col-start-10 lg:row-start-4", hub: "workflow" },
    { name: "Pipelines", icon: Database, pos: "lg:col-start-8 lg:row-start-5", hub: "workflow" },
    { name: "API Connect", icon: Link, pos: "lg:col-start-9 lg:row-start-5", hub: "workflow" },
    { name: "Webhooks", icon: Code, pos: "lg:col-start-10 lg:row-start-5", hub: "workflow" },
    { name: "Realtime Sync", icon: Clock, pos: "lg:col-start-6 lg:row-start-6", hub: "workflow" },
    { name: "Error Logs", icon: Inbox, pos: "lg:col-start-7 lg:row-start-6", hub: "workflow" },
    { name: "Bug Tracking", icon: Bug, pos: "lg:col-start-8 lg:row-start-6", hub: "workflow" },
    { name: "SSO", icon: Key, pos: "lg:col-start-9 lg:row-start-6", hub: "workflow" },
    { name: "Access Control", icon: Shield, pos: "lg:col-start-10 lg:row-start-6", hub: "workflow" },
];

const WorkManagementUI = () => (
    <div className="w-full h-full relative flex items-end justify-center pb-0">
        <div className="w-[80%] h-[80%] bg-[#1A1A1A] rounded-t-xl border-t border-l border-r border-emerald-500/20 flex flex-col gap-2 p-3 shadow-2xl relative translate-y-6 group-hover:translate-y-2 transition-transform duration-500">
            <div className="flex gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            </div>
            <div className="w-full h-8 rounded bg-white/10 flex items-center px-2 gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-400/50" />
                <div className="flex-1 h-1.5 rounded-full bg-emerald-100/20" />
            </div>
            <div className="w-full h-8 rounded bg-white/10 flex items-center px-2 gap-2">
                <div className="w-3 h-3 rounded-sm bg-white/20" />
                <div className="w-2/3 h-1.5 rounded-full bg-emerald-100/20" />
            </div>
        </div>
    </div>
);

// --- AI Agent flow diagram (matches reference: rounded boxes + circles,
// glowing teal borders, solid top-row connectors, dotted branch connectors) ---
const AIAgentUI = () => {
    const Dot = ({ x, y }: { x: number; y: number }) => (
        <div
            className="absolute w-[5px] h-[5px] rounded-full bg-teal-400 shadow-[0_0_4px_rgba(45,212,191,0.9)] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
        />
    );

    const Box = ({
        x,
        y,
        label,
        color = "white",
        icon = false,
        big = false,
    }: {
        x: number;
        y: number;
        label: string;
        color?: "white" | "orange";
        icon?: boolean;
        big?: boolean;
    }) => (
        <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-xl border bg-[#0B0B0B] whitespace-nowrap
                ${big ? "px-3 py-1.5 border-teal-300/80 shadow-[0_0_16px_rgba(45,212,191,0.55)]" : "px-2.5 py-1 border-teal-400/60 shadow-[0_0_8px_rgba(45,212,191,0.3)]"}`}
            style={{ left: `${x}%`, top: `${y}%` }}
        >
            {icon && (
                <span className="w-3.5 h-3.5 rounded-full border border-teal-300 flex items-center justify-center text-[7px] text-teal-300">
                    ●
                </span>
            )}
            <span
                className={`text-[8px] md:text-[9px] font-semibold tracking-wide ${color === "orange" ? "text-orange-400" : "text-white"
                    }`}
            >
                {label}
            </span>
        </div>
    );

    const Circle = ({
        x,
        y,
        label,
        color = "white",
    }: {
        x: number;
        y: number;
        label: string;
        color?: "white" | "orange";
    }) => (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 md:w-12 md:h-12 rounded-full border border-teal-400/60 bg-[#0B0B0B] shadow-[0_0_10px_rgba(45,212,191,0.35)] flex items-center justify-center text-center px-1"
            style={{ left: `${x}%`, top: `${y}%` }}
        >
            <span className={`text-[7px] md:text-[8px] font-semibold ${color === "orange" ? "text-orange-400" : "text-white"}`}>
                {label}
            </span>
        </div>
    );

    return (
        <div className="w-full h-full relative p-2">
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
            >
                {/* Top row — solid connectors */}
                <path d="M 24,14 H 174" stroke="rgba(45,212,191,0.65)" strokeWidth="1" fill="none" />

                {/* AI Agent -> Memory */}
                <path d="M 92,20 V 34 H 50 V 46" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
                {/* AI Agent -> Tools */}
                <path d="M 100,20 V 46" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
                {/* AI Agent -> Planner */}
                <path d="M 108,20 V 34 H 150 V 46" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
                {/* AI Agent -> Observations (long branch, bypasses Memory column) */}
                <path d="M 84,20 V 30 H 10 V 82 H 30" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
                {/* Tools -> Environment */}
                <path d="M 100,58 V 70 H 150 V 82" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
                {/* Observations -> Environment */}
                <path d="M 70,82 H 130" stroke="rgba(45,212,191,0.55)" strokeDasharray="2 3" strokeWidth="1" fill="none" />
            </svg>

            {/* Dots at dashed line corners (percentages match the 200x100 viewBox above) */}
            <Dot x={25} y={34} /> {/* AI Agent -> Memory turn */}
            <Dot x={75} y={34} /> {/* AI Agent -> Planner turn */}
            <Dot x={5} y={30} />  {/* AI Agent -> Observations turn top */}
            <Dot x={5} y={82} />  {/* AI Agent -> Observations turn bottom */}
            <Dot x={75} y={70} /> {/* Tools -> Environment turn */}

            {/* Top row */}
            <Box x={15} y={14} label="Prompt" color="orange" />
            <Box x={51} y={14} label="AI Agent" icon big />
            <Box x={85} y={14} label="Output" color="orange" />

            {/* Middle circles */}
            <Circle x={25} y={52} label="Memory" color="orange" />
            <Circle x={50} y={52} label="Tools" />
            <Circle x={75} y={52} label="Planner" />

            {/* Bottom row */}
            <Box x={25} y={82} label="Observations" />
            <Box x={75} y={82} label="Environment" color="orange" />
        </div>
    );
};

const MarketplaceUI = () => (
    <div className="w-full h-full relative flex items-center justify-center">
        <div className="grid grid-cols-2 gap-3 w-[75%] relative z-10 group-hover:scale-[1.02] transition-transform duration-500">
            <div className="aspect-square rounded-lg bg-cyan-500/10 border border-cyan-400/30 p-2.5 flex flex-col gap-2">
                <div className="w-5 h-5 rounded bg-cyan-400/40 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-cyan-100/20" />
            </div>
            <div className="aspect-square rounded-lg bg-[#1A1A1A] border border-cyan-500/20 p-2.5 flex flex-col gap-2 translate-y-3">
                <div className="w-5 h-5 rounded bg-white/20 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="aspect-square rounded-lg bg-[#1A1A1A] border border-cyan-500/20 p-2.5 flex flex-col gap-2 -translate-y-1">
                <div className="w-5 h-5 rounded bg-white/20 mb-1" />
                <div className="w-4/5 h-1.5 rounded-full bg-white/20" />
            </div>
            <div className="aspect-square rounded-lg bg-cyan-500/10 border border-cyan-400/30 p-2.5 flex flex-col gap-2 translate-y-2">
                <div className="w-5 h-5 rounded bg-cyan-400/40 mb-1" />
                <div className="w-full h-1.5 rounded-full bg-cyan-100/20" />
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
        <div className="absolute left-[20%] w-8 h-8 rounded-lg bg-[#1A1A1A] border border-orange-500/20 flex items-center justify-center z-10 group-hover:border-orange-400 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all duration-500">
            <Bot size={14} className="text-orange-200" />
        </div>
        <div className="absolute right-[25%] top-[20%] w-6 h-6 rounded-md bg-[#1A1A1A] border border-orange-500/20 z-10 group-hover:border-orange-400 transition-all duration-500" />
        <div className="absolute right-[25%] bottom-[20%] w-6 h-6 rounded-md bg-[#1A1A1A] border border-orange-500/20 z-10 group-hover:border-orange-400 transition-all duration-500" />
    </div>
);

const BigCard = ({ title, icon: Icon, hoverColor, posClasses, children, onMouseEnter, onMouseLeave }: any) => (
    <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`lg:col-span-2 lg:row-span-2 ${posClasses} relative group rounded-3xl border border-white/10 bg-[#050505] transition-all duration-500 cursor-default flex flex-col shadow-2xl h-full w-full`}
    >
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
            <h3 className="text-xs md:text-sm font-bold tracking-widest uppercase text-gray-400 group-hover:text-white transition-colors drop-shadow-md text-center">{title}</h3>
        </div>
    </div>
);

const SmallCard = ({ item, activeHub, className = '' }: { item: typeof smallFeatures[0], activeHub: string | null, className?: string }) => {
    const Icon = item.icon;
    const isActive = activeHub === item.hub;
    const isDimmed = activeHub !== null && !isActive;

    // Determine the styling based on the active interactive state
    const getContainerStyles = () => {
        if (isDimmed) return "border-white/5 opacity-30 scale-95"; // Fade out noise
        if (activeHub === null) return "border-white/10 opacity-100 hover:border-white/30"; // Default

        // Highlighted Connected State
        switch (item.hub) {
            case 'agent': return "border-purple-500/60 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]";
            case 'marketplace': return "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]";
            case 'work': return "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
            case 'workflow': return "border-orange-500/60 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]";
            default: return "border-white/10";
        }
    };

    const getIconColorStyles = () => {
        if (isDimmed) return "text-gray-700";
        if (activeHub === null) return "text-gray-400 group-hover:text-white";

        switch (item.hub) {
            case 'agent': return "text-purple-300";
            case 'marketplace': return "text-cyan-300";
            case 'work': return "text-emerald-300";
            case 'workflow': return "text-orange-300";
            default: return "text-white";
        }
    };

    const getTextColorStyles = () => {
        if (isDimmed) return "text-gray-700";
        if (activeHub === null) return "text-gray-400 group-hover:text-gray-200";
        return "text-white drop-shadow-md";
    };

    return (
        <div className={`aspect-square lg:col-span-1 lg:row-span-1 ${item.pos} rounded-2xl border bg-[#050505] flex flex-col items-center justify-center gap-2 relative group overflow-hidden transition-all duration-500 cursor-default p-2 ${getContainerStyles()} ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Icon size={20} strokeWidth={1.5} className={`relative z-10 transition-colors duration-500 ${getIconColorStyles()}`} />
            <span className={`text-[9px] md:text-[10px] font-semibold tracking-wider uppercase text-center px-1 transition-colors duration-500 ${getTextColorStyles()}`}>
                {item.name}
            </span>
        </div>
    );
};

export const PlatformFeaturesSection = () => {
    const [activeHub, setActiveHub] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    // On mobile (grid-cols-4), 4 big cards = 1 row, so 20 small cards = 5 more rows = 6 rows total
    const MOBILE_LIMIT = 20;

    return (
        <section className="relative w-full pt-12 pb-4 lg:pb-12 bg-[#000000] overflow-hidden border-b border-white/5 flex flex-col justify-center">

            {/* Text Content */}
            <div className="relative z-20 container mx-auto px-4 sm:px-10 lg:px-20 mb-20 shrink-0">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-5xl mb-16"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight font-medium text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">Unified system.</span> Agentflox provides the complete platform for users to manage their work and build AI Agent and orchestrate their entire AI workforce in one environment.
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

            {/* Dense Bento Grid Layout with Interactive Hover */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center pb-0 lg:pb-8">
                <div className="[mask-image:radial-gradient(ellipse_95%_95%_at_50%_50%,#000_20%,transparent_90%)] w-full flex justify-center">
                    <div className="container mx-auto px-4 sm:px-10 lg:px-20">
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 lg:gap-3 w-full">

                            {/* THE 4 BIG CENTER CARDS */}
                            <BigCard
                                title="AI OS Core"
                                icon={Bot}
                                hoverColor="from-purple-600 to-fuchsia-600"
                                posClasses="lg:col-start-4 lg:row-start-2"
                                onMouseEnter={() => setActiveHub("agent")}
                                onMouseLeave={() => setActiveHub(null)}
                            >
                                <AIAgentUI />
                            </BigCard>

                            <BigCard
                                title="Ecosystem Hub"
                                icon={Globe}
                                hoverColor="from-cyan-600 to-blue-500"
                                posClasses="lg:col-start-6 lg:row-start-2"
                                onMouseEnter={() => setActiveHub("marketplace")}
                                onMouseLeave={() => setActiveHub(null)}
                            >
                                <MarketplaceUI />
                            </BigCard>

                            <BigCard
                                title="Productivity Hub"
                                icon={Layout}
                                hoverColor="from-emerald-600 to-teal-500"
                                posClasses="lg:col-start-4 lg:row-start-4"
                                onMouseEnter={() => setActiveHub("work")}
                                onMouseLeave={() => setActiveHub(null)}
                            >
                                <WorkManagementUI />
                            </BigCard>

                            <BigCard
                                title="AI Workflows"
                                icon={Workflow}
                                hoverColor="from-orange-600 to-red-500"
                                posClasses="lg:col-start-6 lg:row-start-4"
                                onMouseEnter={() => setActiveHub("workflow")}
                                onMouseLeave={() => setActiveHub(null)}
                            >
                                <AIWorkflowUI />
                            </BigCard>

                            {/* THE SURROUNDING SMALL CARDS (Full Perimeter) */}
                            {smallFeatures.map((item, idx) => (
                                <SmallCard
                                    key={idx}
                                    item={item}
                                    activeHub={activeHub}
                                    className={!showAll && idx >= MOBILE_LIMIT ? 'hidden lg:flex' : ''}
                                />
                            ))}

                        </div>
                    </div>
                </div>
            </div>

            {/* Show More / Less button — mobile only */}
            <div className="lg:hidden flex justify-center mt-4 pb-2 relative z-20">
                <button
                    onClick={() => setShowAll(prev => !prev)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-[#0A0A0A] text-gray-400 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                >
                    {showAll ? 'Show less' : "Show more"}
                </button>
            </div>
        </section>
    );
};