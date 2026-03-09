"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Shield, CheckCircle2, ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for our simulation
type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    stage?: "thinking" | "building" | "done";
};

type AgentState = {
    name: string;
    role: string;
    status: "idle" | "building" | "active";
    capabilities: string[];
};

export function AgentBuilderSimulation() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [agentState, setAgentState] = useState<AgentState>({
        name: "",
        role: "",
        status: "idle",
        capabilities: []
    });

    // Simulation Sequence
    useEffect(() => {
        let timeoutIds: NodeJS.Timeout[] = [];

        const runSimulation = () => {
            setMessages([]);
            setInputValue("");
            setAgentState({ name: "", role: "", status: "idle", capabilities: [] });

            const steps = [
                // Step 1: Type prompt
                {
                    time: 1000,
                    action: () => typeText("Create a senior developer agent expert on python", 50)
                },
                // Step 2: Send message
                {
                    time: 3500,
                    action: () => {
                        setInputValue("");
                        addMessage("user", "Create a senior developer agent expert on python");
                    }
                },
                // Step 3: Agent Thinking
                {
                    time: 4000,
                    action: () => {
                        addMessage("assistant", "Analyzing requirements...", "thinking");
                    }
                },
                // Step 4: Agent Response & Building Start
                {
                    time: 6000,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? { ...m, content: "I'll create a Senior Python Developer agent. Setting up environment...", stage: "building" } : m));
                        setAgentState(prev => ({ ...prev, status: "building", name: "DevBot-Alpha" }));
                    }
                },
                // Step 5: Progress Updates
                {
                    time: 7500,
                    action: () => {
                        setAgentState(prev => ({ ...prev, role: "Senior Software Engineer", capabilities: ["Python 3.12", "Django", "FastAPI"] }));
                    }
                },
                // Step 6: Completion
                {
                    time: 9500,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "building" ? { ...m, content: "Agent 'PyDev-Expert' is ready and deployed.", stage: "done" } : m));
                        setAgentState(prev => ({ ...prev, status: "active", name: "PyDev-Expert", role: "Senior Python Architect" }));
                    }
                },
                // Reset loop
                {
                    time: 14000,
                    action: () => runSimulation()
                }
            ];

            steps.forEach(step => {
                timeoutIds.push(setTimeout(step.action, step.time));
            });
        };

        runSimulation();

        return () => timeoutIds.forEach(clearTimeout);
    }, []);

    const typeText = (text: string, speed: number) => {
        let i = 0;
        const interval = setInterval(() => {
            setInputValue(text.substring(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, speed);
    };

    const addMessage = (role: "user" | "assistant", content: string, stage?: "thinking" | "building" | "done") => {
        setMessages(prev => [...prev, { id: Math.random().toString(), role, content, stage }]);
    };

    return (
        <div className="w-full h-[600px] bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-14 border-b border-white/5 flex items-center px-6 bg-[#0F0F0F]">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 mr-4" />
                    <span className="text-xs font-mono text-gray-500">Agent Builder v2.0</span>
                </div>

                {/* Messages */}
                <div className="flex-1 p-6 space-y-6 overflow-hidden relative">
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-4 max-w-[90%]",
                                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                    msg.role === "assistant" ? "bg-indigo-600/20 text-indigo-400" : "bg-gray-700/20 text-gray-400"
                                )}>
                                    {msg.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm leading-relaxed",
                                    msg.role === "assistant" ? "bg-white/5 border border-white/5 text-gray-200" : "bg-indigo-600 text-white"
                                )}>
                                    {msg.content}
                                    {msg.stage === "thinking" && (
                                        <div className="mt-2 flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    )}
                                    {msg.stage === "building" && (
                                        <div className="mt-3 space-y-2">
                                            <div className="h-1 w-full bg-white/10 rounded overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-indigo-500"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: "100%" }}
                                                    transition={{ duration: 2 }}
                                                />
                                            </div>
                                            <div className="text-xs text-indigo-300 font-mono">Initializing neural weights...</div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/5 bg-[#0F0F0F]">
                    <div className="h-12 bg-black/50 border border-white/10 rounded-xl pl-4 pr-2 flex items-center justify-between text-sm text-gray-300">
                        <div className="flex items-center">
                            {inputValue}
                            {inputValue.length === 0 && <span className="text-gray-600">Type a message...</span>}
                            <span className="w-0.5 h-5 bg-indigo-500 ml-1 animate-pulse" />
                        </div>
                        <button className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                            inputValue.length > 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-gray-600"
                        )}>
                            <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar (Agent Profile) */}
            <div className="w-80 bg-[#0F0F0F] border-l border-white/5 p-6 flex flex-col gap-6 transform transition-all duration-500">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Live Preview</div>

                {/* Agent Card */}
                <motion.div
                    className="bg-[#151515] rounded-xl p-6 border border-white/5 relative overflow-hidden group"
                    animate={{
                        opacity: agentState.status !== "idle" ? 1 : 0.5,
                        scale: agentState.status !== "idle" ? 1 : 0.95
                    }}
                >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20">ACTIVE</div>
                    </div>

                    {/* Image of Robot (Builder) */}
                    <div className="w-full aspect-square rounded-2xl bg-black/50 mb-4 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                        {/* Using the generated image for builder robots */}
                        <img
                            src="/images/robot-6.png"
                            alt="Agent Preview"
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent opacity-90" />

                        {/* Building/Scanning Effect */}
                        {agentState.status === "building" && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-indigo-500/10 mix-blend-overlay"
                                />
                                <motion.div
                                    className="absolute left-0 right-0 h-[2px] bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)]"
                                    animate={{ top: ["0%", "100%"] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute top-2 right-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-indigo-300 border border-indigo-500/30">
                                        <Sparkles size={10} className="animate-pulse" />
                                        BUILDING
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse mb-2" style={{ display: agentState.name ? 'none' : 'block' }} />
                            {agentState.name && (
                                <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-bold text-white relative z-20">
                                    {agentState.name}
                                </motion.h3>
                            )}

                            <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" style={{ display: agentState.role ? 'none' : 'block' }} />
                            {agentState.role && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-indigo-300 relative z-20">
                                    {agentState.role}
                                </motion.p>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-500">IQ Score</div>
                            <div className="text-sm font-mono text-white">142</div>
                        </div>
                        <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                            <div className="text-[10px] text-gray-500">Speed</div>
                            <div className="text-sm font-mono text-white">45ms</div>
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium">Capabilities</div>
                        <div className="flex flex-wrap gap-2">
                            {agentState.capabilities.length > 0 ? (
                                agentState.capabilities.map((cap, i) => (
                                    <motion.span
                                        key={cap}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-300"
                                    >
                                        {cap}
                                    </motion.span>
                                ))
                            ) : (
                                <>
                                    <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
                                    <div className="h-5 w-12 bg-white/5 rounded animate-pulse" />
                                    <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* System Status */}
                <div className="flex-1 bg-[#151515] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Shield size={14} className="text-emerald-500" />
                        <span className="text-xs text-gray-400">Security Protocols</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Memory isolation</span>
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Enabled</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Tool permissions</span>
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> Restricted</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded overflow-hidden">
                            <div className="h-full bg-emerald-500 w-full" />
                        </div>
                        <div className="text-[10px] text-gray-600 text-center mt-2">
                            System verified safe for enterprise deployment
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AgentBuilderSimulation;
