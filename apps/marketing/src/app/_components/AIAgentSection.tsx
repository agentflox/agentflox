"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Share2, GitMerge, FileCheck, Brain, Terminal, MessageSquare, Zap, ShieldCheck, Activity, Cpu, Layers, Server, ClipboardCheck, Rocket, Briefcase, Hammer } from "lucide-react";

// --- ANIMATION COMPONENTS ---

const AgentNode = ({ icon: Icon, label, status, color, x, y }: any) => {
    // Colors for different states
    const colors: any = {
        indigo: "bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]",
        blue: "bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)]",
        cyan: "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]",
        purple: "bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]",
        green: "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]",
    };

    // Inactive state style
    const inactiveClass = "bg-[#0F0F10] border-white/20 text-gray-500 opacity-80";
    // Active state style (processing)
    const activeClass = colors[color] || colors.indigo;
    // Completed state style
    const completedClass = "bg-[#0A0A0A] border-white/40 text-white opacity-100";

    const isProcessing = status === 'active';
    const isCompleted = status === 'completed';

    const currentClass = isProcessing ? activeClass : (isCompleted ? completedClass : inactiveClass);

    return (
        <motion.div
            className="absolute flex flex-col items-center gap-2 z-20"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            animate={{ scale: isProcessing ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
        >
            <div className={`
                w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center 
                border-2 transition-all duration-300 backdrop-blur-md relative
                ${currentClass}
            `}>
                <Icon size={24} className="transition-colors duration-300" />

                {/* Processing Spinner Ring */}
                {isProcessing && (
                    <div className="absolute inset-[-4px] border-2 border-transparent border-t-current rounded-full animate-spin opacity-70" />
                )}
            </div>

            {/* Label */}
            <div className={`
                px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-black/80 border transition-colors duration-300
                ${isProcessing ? `border-${color}-500/50 text-white` : "border-white/10 text-gray-500"}
            `}>
                {label}
            </div>
        </motion.div>
    );
};

// Particle Only Connection - High Visibility (Z-40)
const ActiveConnection = ({ start, end, isActive, color }: any) => {
    return (
        <>
            {/* Travelling Particle for active state */}
            {isActive && (
                <motion.div
                    className="absolute w-3 h-3 rounded-full z-40 bg-white shadow-[0_0_15px_rgba(255,255,255,1)]"
                    initial={{
                        left: `${start.x}%`, top: `${start.y}%`,
                        opacity: 0,
                        transform: 'translate(-50%, -50%)'
                    }}
                    animate={{
                        left: `${end.x}%`, top: `${end.y}%`,
                        opacity: [0.2, 1, 1, 0]
                    }}
                    transition={{
                        duration: 0.5,
                        ease: "linear",
                        repeat: Infinity,
                        repeatDelay: 0.1
                    }}
                />
            )}
        </>
    );
};

const AgentWorkflowVisual = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Super Fast sequence: Total active time ~2.5s
        // Restart every 3.5s
        const runLoop = () => {
            setStep(0);
            setTimeout(() => setStep(1), 500);
            setTimeout(() => setStep(2), 1000);
            setTimeout(() => setStep(3), 1500);
            setTimeout(() => setStep(4), 2000);
            setTimeout(() => setStep(5), 2500);
        };

        runLoop();
        const interval = setInterval(runLoop, 4000);

        return () => clearInterval(interval);
    }, []);

    const pos = {
        manager: { x: 50, y: 15 },
        assign: { x: 80, y: 35 },
        perform: { x: 50, y: 50 },
        review: { x: 20, y: 65 },
        deploy: { x: 50, y: 80 },
    };

    const getStatus = (nodeStep: number) => {
        if (step === nodeStep) return 'active';
        if (step > nodeStep) return 'completed';
        return 'idle';
    };

    return (
        <div className="relative w-full h-[400px] lg:h-[500px] bg-[#0A0A0A] rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex">
            {/* Grid & Noise Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* --- VISUAL AREA (Left 80%) --- */}
            <div className="relative flex-1 h-full">

                {/* 1. Manager -> Assign */}
                <ActiveConnection start={pos.manager} end={pos.assign} isActive={step >= 1} color="indigo" />

                {/* 2. Assign -> Perform */}
                <ActiveConnection start={pos.assign} end={pos.perform} isActive={step >= 2} color="blue" />

                {/* 3. Perform -> Review */}
                <ActiveConnection start={pos.perform} end={{ x: 30, y: 62 }} isActive={step >= 3} color="cyan" />

                {/* 4. Review -> Deliver (Deploy) - Connected to TOP edge (y:72) */}
                <ActiveConnection start={{ x: 30, y: 62 }} end={{ x: 50, y: 80 }} isActive={step >= 4} color="purple" />


                {/* --- NODES --- */}
                {/* MANAGER */}
                <AgentNode icon={Brain} label="MANAGER" color="indigo" {...pos.manager} status={getStatus(1)} />

                {/* ASSIGN */}
                <AgentNode icon={Briefcase} label="ASSIGN" color="blue" {...pos.assign} status={getStatus(2)} />

                {/* PERFORM */}
                <AgentNode icon={Hammer} label="PERFORM" color="cyan" {...pos.perform} status={getStatus(3)} />

                {/* REVIEW */}
                <AgentNode icon={ClipboardCheck} label="REVIEW" color="purple" {...pos.review} status={getStatus(4)} />

                {/* DELIVER */}
                <AgentNode icon={Rocket} label="DELIVER" color="green" {...pos.deploy} status={getStatus(5)} />

                {/* Status Logs Bubble - Top Left */}
                <div className="absolute top-6 left-6 font-mono text-[10px] text-indigo-300 bg-black/60 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-sm z-30 shadow-lg flex items-center gap-2 max-w-[200px] md:max-w-none">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                    {step === 0 && "System Idle. Ready..."}
                    {step === 1 && "Manager: Scoping..."}
                    {step === 2 && "Planner: Assigning tasks..."}
                    {step === 3 && "Executor: Working..."}
                    {step === 4 && "Auditor: Verifying..."}
                    {step === 5 && "System: Delivered."}
                </div>
            </div>

            {/* --- RIGHT SIDE BADGE/PANEL --- */}
            <div className="hidden sm:flex w-20 lg:w-24 border-l border-white/5 flex-col items-center py-8 bg-[#0C0C0C] z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] justify-between">

                <div className="flex flex-col gap-6 w-full items-center">
                    <div className="flex flex-col gap-2 items-center">
                        <div className="text-[9px] text-gray-600 font-mono tracking-wider uppercase">CPU</div>
                        <div className="w-1.5 h-16 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
                            <motion.div
                                className="w-full bg-indigo-500"
                                animate={{ height: ["20%", "70%", "40%", "90%", "30%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 items-center">
                        <div className="text-[9px] text-gray-600 font-mono tracking-wider uppercase">MEM</div>
                        <div className="w-1.5 h-16 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
                            <motion.div
                                className="w-full bg-purple-500"
                                animate={{ height: ["30%", "50%", "30%", "60%", "40%"] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>
                    </div>
                </div>

                {/* Vertical Label */}
                <div className="flex-1 flex items-center justify-center py-8">
                    <div className="writing-vertical text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase opacity-60" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                        Live Architecture
                    </div>
                </div>

                {/* System Icon */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-emerald-500 shadow-lg mb-4">
                    <Server size={18} />
                </div>
            </div>
        </div>
    );
};


// --- FEATURE CARDS ---

const FeatureCard = ({ icon: Icon, title, description }: any) => (
    <div className="p-6 rounded-2xl bg-[#0F0F10] border border-white/5 hover:border-indigo-500/20 transition-all duration-300 group">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all">
            <Icon size={20} className="text-gray-400 group-hover:text-indigo-400" />
        </div>
        <h4 className="text-white font-semibold mb-2">{title}</h4>
        <p className="text-sm text-gray-400 leading-relaxed font-light">{description}</p>
    </div>
);


// --- MAIN SECTION ---

export const AIAgentSection = () => {
    return (
        <section className="relative w-full py-24 px-4 sm:px-10 lg:px-20 bg-[#030303] overflow-hidden border-b border-white/5">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Main Container */}
            <div className="relative max-w-7xl mx-auto w-full z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                    {/* LEFT COLUMN: Visual */}
                    <div className="relative w-full order-2 lg:order-1">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-indigo-500/10 blur-[80px] rounded-full -z-10" />
                        <AgentWorkflowVisual />
                    </div>

                    {/* RIGHT COLUMN: Content */}
                    <div className="flex flex-col gap-8 order-1 lg:order-2">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm">
                                <Activity size={12} />
                                Agentic Workflow Engine
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                                Autonomous Teams, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                                    Infinite Potential.
                                </span>
                            </h2>
                            <p className="text-gray-400 text-lg font-light leading-relaxed">
                                Deploy intelligent agents that self-organize, communicate, and execute complex goals. It's not just automation—it's orchestration.
                            </p>
                        </div>

                        {/* Feature Grid */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <FeatureCard
                                icon={GitMerge}
                                title="Dynamic Branching"
                                description="Workflows adapt in real-time based on task complexity."
                            />
                            <FeatureCard
                                icon={MessageSquare}
                                title="Active Dialogue"
                                description="Agents critique and refine each other's work autonomously."
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="Enterprise Safety"
                                description="Strict guardrails prevent hallucinations and unauthorized access."
                            />
                            <FeatureCard
                                icon={Bot}
                                title="Scalable Swarms"
                                description="Spin up 1 or 1,000 agents instantly to handle load."
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};