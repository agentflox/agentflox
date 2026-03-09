"use client";

import React from "react";
import { motion } from "framer-motion";
import { Brain, Code2, PenTool, Search, Database, MessageSquare } from "lucide-react";

export function MultiAgentFlow() {
    const satellites = [
        { id: "research", icon: Search, label: "Researcher", x: 20, y: 20, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { id: "code", icon: Code2, label: "Engineer", x: 80, y: 20, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { id: "write", icon: PenTool, label: "Copywriter", x: 80, y: 80, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { id: "db", icon: Database, label: "Analyst", x: 20, y: 80, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    ];

    return (
        <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden rounded-3xl bg-[#050505] border border-white/5">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Connection Lines (SVG) using viewBox 0 0 100 100 for robust scaling */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(99, 102, 241, 0.1)" />
                        <stop offset="50%" stopColor="rgba(99, 102, 241, 0.5)" />
                        <stop offset="100%" stopColor="rgba(99, 102, 241, 0.1)" />
                    </linearGradient>
                </defs>
                {satellites.map((sat) => (
                    <g key={sat.id}>
                        {/* Base Line */}
                        <line
                            x1="50"
                            y1="50"
                            x2={sat.x}
                            y2={sat.y}
                            stroke="white"
                            strokeOpacity="0.05"
                            strokeWidth="0.5" // Scaled relative to 100x100 box
                        />
                        {/* Animated Particle - using specific path in 100x100 space */}
                        <circle r="1" fill="#818cf8">
                            <animateMotion
                                dur="3s"
                                repeatCount="indefinite"
                                path={`M 50 50 L ${sat.x} ${sat.y}`}
                            />
                        </circle>
                        <circle r="1" fill="#818cf8">
                            <animateMotion
                                dur="3s"
                                begin="1.5s"
                                repeatCount="indefinite"
                                path={`M ${sat.x} ${sat.y} L 50 50`}
                            />
                        </circle>
                    </g>
                ))}
            </svg>

            {/* Central Node (Orchestrator) */}
            <motion.div
                className="absolute z-20 flex flex-col items-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ left: "50%", top: "50%", x: "-50%", y: "-50%" }}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full" />
                    <div className="w-20 h-20 rounded-full bg-[#0A0A0A] border border-indigo-500/50 flex items-center justify-center relative z-10 shadow-2xl shadow-indigo-500/20">
                        <Brain size={32} className="text-indigo-400" />
                    </div>
                    {/* Ripples */}
                    <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
                </div>
                <div className="mt-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-indigo-300 font-mono">
                    Orchestrator
                </div>
            </motion.div>

            {/* Satellite Nodes */}
            {satellites.map((sat) => (
                <motion.div
                    key={sat.id}
                    className="absolute z-10 flex flex-col items-center"
                    style={{ left: `${sat.x}%`, top: `${sat.y}%`, x: "-50%", y: "-50%" }}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg backdrop-blur-sm transition-transform hover:scale-110",
                        sat.bg, sat.border, sat.color
                    )}>
                        <sat.icon size={20} />
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded border border-white/5">
                        {sat.label}
                    </div>
                </motion.div>
            ))}

            {/* Floating labels/badges for context - Moved to avoid overlap */}
            <motion.div
                className="absolute top-4 left-4 bg-white/5 backdrop-blur border border-white/10 p-3 rounded-lg max-w-[200px]"
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <div className="flex items-start gap-2">
                    <MessageSquare size={14} className="text-gray-400 mt-1" />
                    <div className="space-y-1">
                        <div className="text-xs text-gray-300">"Research competitor pricing and update the database."</div>
                        <div className="text-[10px] text-indigo-400 font-mono">Trace: Task-Delegation-Protocol</div>
                    </div>
                </div>
            </motion.div>

        </div>
    );
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

export default MultiAgentFlow;
