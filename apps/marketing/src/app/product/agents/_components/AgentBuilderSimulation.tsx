"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Shield, CheckCircle2, ArrowUp, Sparkles, MessageSquare, Play, Calendar, FileText, Zap, Wrench, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for our simulation
type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    stage?: "thinking" | "streaming" | "done";
    thinkingSteps?: { label: string; status: 'active' | 'done' }[];
};

type AgentState = {
    name: string;
    role: string;
    status: "idle" | "building" | "active";
    capabilities: string[];
};

export function AgentBuilderSimulation({ dark = false }: { dark?: boolean }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [agentState, setAgentState] = useState<AgentState>({
        name: "",
        role: "",
        status: "idle",
        capabilities: []
    });
    const [showBlueImage, setShowBlueImage] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);

    const buildStages = [
        { id: 'initialization', label: 'Initialization', description: 'Setting up agent context', progress: 10 },
        { id: 'configuration', label: 'Configuration', description: 'Collecting agent details and settings', progress: 50 },
        { id: 'launch', label: 'Launch', description: 'Agent is ready!', progress: 100 },
    ];

    // Cycle between robot images like AgentBuilderPreview
    useEffect(() => {
        const imageInterval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setShowBlueImage(prev => !prev);
                setIsAnimating(false);
            }, 400);
        }, 4000);
        return () => clearInterval(imageInterval);
    }, []);

    // Simulation Sequence
    useEffect(() => {
        let timeoutIds: NodeJS.Timeout[] = [];
        let typingInterval: NodeJS.Timeout | null = null;

        const typeText = (text: string, speed: number) => {
            let i = 0;
            typingInterval = setInterval(() => {
                setInputValue(text.substring(0, i + 1));
                i++;
                if (i >= text.length && typingInterval) {
                    clearInterval(typingInterval);
                }
            }, speed);
            timeoutIds.push(typingInterval as unknown as NodeJS.Timeout);
        };

        const runSimulation = () => {
            setMessages([]);
            setInputValue("");
            setAgentState({ name: "", role: "", status: "idle", capabilities: [] });
            setCurrentStageIndex(0);

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
                        if (typingInterval) clearInterval(typingInterval);
                        setInputValue("");
                        addMessage("user", "Create a senior developer agent expert on python");
                    }
                },
                // Step 3: Thinking - Intent Analysis
                {
                    time: 3500,
                    action: () => {
                        addMessage("assistant", "", "thinking", [
                            { label: "Inferring builder intent from message...", status: "active" }
                        ]);
                    }
                },
                // Step 3.1: Safety evaluation
                {
                    time: 4400,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "active" }
                            ]
                        } : m));
                    }
                },
                // Step 3.2: Entity scope
                {
                    time: 5500,
                    action: () => {
                        setCurrentStageIndex(1);
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "active" }
                            ]
                        } : m));
                    }
                },
                // Step 3.3: Config extraction
                {
                    time: 6100,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "done" },
                                { label: "Extracting agent configuration schema...", status: "active" }
                            ]
                        } : m));
                        setAgentState(prev => ({ ...prev, status: "building", name: "DevBot-Alpha" }));
                    }
                },
                // Step 3.4: Automation inference
                {
                    time: 7100,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "done" },
                                { label: "Extracting agent configuration schema...", status: "done" },
                                { label: "Inferring automation triggers & schedules...", status: "active" }
                            ]
                        } : m));
                    }
                },
                // Step 3.5: Prompt generation
                {
                    time: 8100,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "done" },
                                { label: "Extracting agent configuration schema...", status: "done" },
                                { label: "Inferring automation triggers & schedules...", status: "done" },
                                { label: "Generating system prompt & capabilities...", status: "active" }
                            ]
                        } : m));
                        setAgentState(prev => ({ ...prev, role: "Senior Software Engineer", capabilities: ["Python 3.12", "Django", "FastAPI"] }));
                    }
                },
                // Step 3.6: Stage readiness check
                {
                    time: 9200,
                    action: () => {
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "done" },
                                { label: "Extracting agent configuration schema...", status: "done" },
                                { label: "Inferring automation triggers & schedules...", status: "done" },
                                { label: "Generating system prompt & capabilities...", status: "done" },
                                { label: "Validating stage readiness & merging draft...", status: "active" }
                            ]
                        } : m));
                    }
                },
                // Step 4: Start streaming response
                {
                    time: 10400,
                    action: () => {
                        setCurrentStageIndex(2);
                        setMessages(prev => prev.map(m => m.stage === "thinking" ? {
                            ...m,
                            stage: "streaming",
                            thinkingSteps: [
                                { label: "Inferring builder intent from message...", status: "done" },
                                { label: "Running semantic safety evaluation...", status: "done" },
                                { label: "Scoping entity context & permissions...", status: "done" },
                                { label: "Extracting agent configuration schema...", status: "done" },
                                { label: "Inferring automation triggers & schedules...", status: "done" },
                                { label: "Generating system prompt & capabilities...", status: "done" },
                                { label: "Validating stage readiness & merging draft...", status: "done" }
                            ]
                        } : m));

                        const fullText = `I've fully configured your Senior Python Developer agent. Here's a summary of what was set up:\n\nAgent Name: PyDev-Expert\nRole: Senior Python Architect & Code Reviewer\n\nCore Capabilities:\n- Python 3.12, asyncio, type hints, and modern PEP standards\n- Django 5.x REST framework with ORM query optimization\n- FastAPI with async endpoints, Pydantic v2, and auto OpenAPI docs\n- Pytest, coverage reporting, and CI/CD pipeline integration\n- Code review, refactoring, and runtime performance profiling\n- Security scanning with Bandit and dependency auditing\n\nSystem Prompt: The agent is instructed to follow clean code principles, write fully-tested modules, provide inline JSDoc-style documentation, proactively flag anti-patterns, and suggest architectural improvements when applicable.\n\nAutomation: A daily code health trigger has been inferred — it will scan open pull requests, flag anti-patterns, and post a structured review summary to your team channel.\n\nSecurity: Tool access is scoped to read-only repository access and sandboxed execution. No write permissions are granted by default.\n\nYour agent is fully configured and ready to deploy. Shall I launch PyDev-Expert now?`;

                        let charIdx = 0;
                        const streamInterval = setInterval(() => {
                            charIdx += 4; // Type 4 chars per frame to reduce render thrashing
                            setMessages(prev => prev.map(m => m.stage === "streaming" ? { ...m, content: fullText.substring(0, charIdx) } : m));
                            
                            if (charIdx >= fullText.length) {
                                clearInterval(streamInterval);
                                setMessages(prev => prev.map(m => m.stage === "streaming" ? { ...m, stage: "done", content: fullText } : m));
                            }
                        }, 25);
                        
                        // Add to timeoutIds so it gets cleared if component unmounts
                        timeoutIds.push(streamInterval as unknown as NodeJS.Timeout);
                    }
                },
                // Step 5: Agent active
                {
                    time: 18000,
                    action: () => {
                        setAgentState(prev => ({ ...prev, status: "active", name: "PyDev-Expert", role: "Senior Python Architect" }));
                    }
                },
                // Reset loop
                {
                    time: 28000,
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

    const addMessage = (role: "user" | "assistant", content: string, stage?: "thinking" | "streaming" | "done", thinkingSteps?: { label: string; status: 'active' | 'done' }[]) => {
        setMessages(prev => [...prev, { id: Math.random().toString(), role, content, stage, thinkingSteps }]);
    };

    return (
        <div className={`w-full h-[600px] rounded-2xl border shadow-2xl overflow-hidden flex flex-col md:flex-row ${dark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'}`}>
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 max-w-full md:max-w-[55%]">
                {/* Header */}
                <div className={`h-14 border-b flex items-center px-6 ${dark ? 'border-white/10 bg-[#111]' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/50 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500/50 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-green-400 border border-emerald-500/50 mr-4" />
                    <span className={`text-xs font-mono ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Agent Builder v2.0</span>
                </div>

                {/* Messages */}
                <div className={`flex-1 p-6 space-y-6 overflow-y-auto relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
                    <AnimatePresence>
                        {messages.map((msg) => {
                            if (msg.role === "user") {
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-end gap-3 px-2 sm:px-4"
                                    >
                                        <div className={`max-w-[72%] rounded-[20px] px-5 py-3 text-[15px] leading-relaxed ${dark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                            {msg.content}
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-gray-200 mt-1">
                                            <img src="https://i.pravatar.cc/100?img=33" alt="User" className="w-full h-full object-cover" />
                                        </div>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="px-2 sm:px-4 py-1 group"
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="h-8 flex items-center shrink-0">
                                            <img src="/images/logo.png" alt="Agentflox" className="h-full w-auto object-contain" />
                                        </div>
                                        <span className={`text-sm font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                                            Agent Builder
                                        </span>
                                    </div>
                                    <div className={`text-[15px] leading-relaxed ${dark ? 'text-gray-300' : 'text-slate-800'}`}>
                                        {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                                            <div className="mb-3 space-y-2">
                                                {msg.thinkingSteps.map((step, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs font-medium">
                                                        {step.status === 'done' ? (
                                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                                        ) : (
                                                            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                        )}
                                                        <span className={step.status === 'done' ? "text-slate-500" : "text-indigo-600"}>
                                                            {step.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {msg.content && (
                                            <div>
                                                {msg.content}
                                                {msg.stage === "streaming" && (
                                                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 animate-pulse align-middle rounded-sm" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className={`p-4 border-t ${dark ? 'border-white/10 bg-[#111]' : 'border-gray-100 bg-white'}`}>
                    <div className={`h-12 rounded-xl pl-4 pr-2 flex items-center justify-between text-sm border ${dark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        <div className="flex items-center">
                            {inputValue}
                            {inputValue.length === 0 && <span className="text-gray-400">Type a message...</span>}
                            <span className="w-0.5 h-5 bg-indigo-500 ml-1 animate-pulse" />
                        </div>
                        <button className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                            inputValue.length > 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-gray-200 text-gray-400"
                        )}>
                            <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar (Agent Profile / Preview Switch) */}
            <div className={`hidden md:flex flex-1 border-l p-6 flex-col gap-6 transform transition-all duration-500 relative overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dark ? 'bg-[#111] border-white/10' : 'bg-[#f8fafc] border-gray-200'}`}>
                <AnimatePresence mode="wait">
                    {agentState.status !== "active" ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className={`absolute inset-0 p-6 flex flex-col ${dark ? 'bg-[#111]' : 'bg-[#f8fafc]'}`}
                        >
                            {/* This recreates AgentBuilderPreview.tsx UI */}
                            <div className={`w-full mx-auto h-full flex flex-col overflow-hidden rounded-xl border shadow-sm ${dark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'}`}>
                                {/* Progress Bar */}
                                <div className={`px-6 py-6 border-b ${dark ? 'border-white/10' : 'border-gray-200'}`}>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={`font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Stage {currentStageIndex + 1} of {buildStages.length}
                                            </span>
                                        </div>
                                        <div className="flex gap-1.5 pt-2">
                                            {buildStages.map((stage, index) => (
                                                <motion.div
                                                    key={stage.id}
                                                    className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${index <= currentStageIndex
                                                        ? showBlueImage && index >= 2
                                                            ? "bg-blue-500"
                                                            : "bg-pink-500"
                                                        : "bg-gray-200"
                                                        }`}
                                                    initial={{ scaleX: 0 }}
                                                    animate={{ scaleX: 1 }}
                                                    transition={{ delay: index * 0.1 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Image Animation Container */}
                                <div className={`relative w-full flex items-center justify-center overflow-hidden h-[240px] border-b ${dark ? 'bg-[#0D0D0D] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                    {/* Ambient Glow */}
                                    <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent" />
                                    <motion.div
                                        className="absolute inset-0 opacity-5"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                        style={{
                                            backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)`,
                                            backgroundSize: "30px 30px",
                                        }}
                                    />

                                    {/* Image Container */}
                                    <div className="relative w-3/5 h-4/5">
                                        <AnimatePresence mode="wait">
                                            {!showBlueImage ? (
                                                <motion.div
                                                    key="pink"
                                                    initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <motion.div
                                                        animate={{ y: [0, -8, 0] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                                        className="relative w-full h-full"
                                                    >
                                                        <Image src="/images/robot-3.png" alt="Phase 1" fill className="object-contain filter drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px rgba(236, 72, 153, 0.3))" }} />
                                                        <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/10 to-transparent" animate={{ y: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                                                    </motion.div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="blue"
                                                    initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <motion.div
                                                        animate={{ y: [0, -8, 0] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                                        className="relative w-full h-full"
                                                    >
                                                        <Image src="/images/robot-4.png" alt="Phase 2" fill className="object-contain filter drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 30px rgba(59, 130, 246, 0.3))" }} />
                                                        <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" animate={{ y: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Particle Effects */}
                                        {isAnimating && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                {[...Array(8)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className={`absolute w-1 h-1 rounded-full ${showBlueImage ? "bg-blue-400" : "bg-pink-400"}`}
                                                        initial={{ x: "50%", y: "50%", opacity: 0 }}
                                                        animate={{ x: `${50 + Math.cos((i / 8) * Math.PI * 2) * 50}%`, y: `${50 + Math.sin((i / 8) * Math.PI * 2) * 50}%`, opacity: [0, 1, 0] }}
                                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2, ease: "easeOut" }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Corner Accents */}
                                    <div className={`absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-lg ${dark ? 'border-white/20' : 'border-gray-300'}`} />
                                    <div className={`absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-lg ${dark ? 'border-white/20' : 'border-gray-300'}`} />
                                    <div className={`absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-lg ${dark ? 'border-white/20' : 'border-gray-300'}`} />
                                    <div className={`absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-lg ${dark ? 'border-white/20' : 'border-gray-300'}`} />
                                </div>

                                {/* Stage Information */}
                                <div className={`py-6 px-6 border-b ${dark ? 'border-white/10' : 'border-gray-100'}`}>
                                    <motion.div
                                        key={buildStages[currentStageIndex]?.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="relative -ml-2">
                                                <div className={`w-3 h-3 rounded-full ${showBlueImage ? "bg-blue-500" : "bg-pink-500"}`} />
                                                {agentState.status === "building" && (
                                                    <motion.div
                                                        className={`absolute inset-0 rounded-full ${showBlueImage ? "bg-blue-500" : "bg-pink-500"}`}
                                                        animate={{ scale: [1, 2, 2], opacity: [0.5, 0, 0] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                    />
                                                )}
                                            </div>
                                            <h3 className={`text-lg font-semibold leading-none ${dark ? 'text-white' : 'text-gray-900'}`}>
                                                {buildStages[currentStageIndex]?.label}
                                            </h3>
                                        </div>
                                        <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {buildStages[currentStageIndex]?.description}
                                        </p>
                                    </motion.div>
                                </div>

                                {/* Action Button */}
                                <div className={`flex items-center justify-center p-6 flex-1 ${dark ? 'bg-transparent' : 'bg-gray-50/30'}`}>
                                    <div className="relative overflow-hidden w-full">
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <div className={`relative border rounded-xl p-4 overflow-hidden shadow-sm ${dark ? 'bg-white/5 border-white/10' : 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200'}`}>
                                                {/* Animated progress shine */}
                                                <motion.div
                                                    className={`absolute inset-0 bg-gradient-to-r from-transparent ${showBlueImage ? "via-blue-100/40" : "via-pink-100/40"} to-transparent`}
                                                    animate={{ x: ["-100%", "200%"] }}
                                                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                                />

                                                <div className="relative flex items-center justify-center gap-3">
                                                    {/* Building spinner */}
                                                    <div className="relative w-6 h-6">
                                                        <motion.div
                                                            className="absolute inset-0"
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        >
                                                            <svg className="w-full h-full" viewBox="0 0 40 40">
                                                                <circle cx="20" cy="20" r="16" fill="none" stroke="url(#buildGradientSim)" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 20" />
                                                                <defs>
                                                                    <linearGradient id="buildGradientSim" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                        <stop offset="0%" stopColor={showBlueImage ? "#3b82f6" : "#ec4899"} />
                                                                        <stop offset="100%" stopColor={showBlueImage ? "#8b5cf6" : "#f97316"} />
                                                                    </linearGradient>
                                                                </defs>
                                                            </svg>
                                                        </motion.div>
                                                    </div>

                                                    <span className={`text-[15px] font-semibold ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                        Building Agent
                                                    </span>

                                                    {/* Animated dots */}
                                                    <motion.span
                                                        className={`font-bold tracking-widest ${dark ? 'text-gray-500' : 'text-gray-400'}`}
                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                    >
                                                        ...
                                                    </motion.span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, type: "spring", bounce: 0 }}
                            className={`absolute inset-0 p-6 flex flex-col gap-6 ${dark ? 'bg-[#111]' : 'bg-[#f8fafc]'}`}
                        >
                            {/* This recreates AgentProfile.tsx UI */}
                            <div className={`rounded-xl border shadow-sm overflow-hidden ${dark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'}`}>
                                <div className="space-y-4 px-6 py-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 min-w-0 flex-1">
                                            <div className="flex-shrink-0 relative">
                                                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center border overflow-hidden shadow-sm ${dark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50/50 border-indigo-100/50'}`}>
                                                    <Image src="/images/robot-4.png" alt="Agent Avatar" fill className="object-cover scale-110" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2 mt-1">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className={`text-xl font-bold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{agentState.name}</h3>
                                                    <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-700 border-green-500/20 uppercase tracking-wider">
                                                        <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                                        Live
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span>Created just now</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 flex-shrink-0 mt-2">
                                            <div className={`flex items-center rounded-lg border shadow-sm overflow-hidden ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                                <div className={`h-9 w-10 flex items-center justify-center cursor-pointer transition-colors ${dark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className={`h-9 w-px ${dark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                                <div className={`h-9 w-10 flex items-center justify-center cursor-pointer transition-colors ${dark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                    <Play className="w-4 h-4 ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dummy Tabs UI */}
                            <div className={`flex-1 rounded-xl border shadow-sm flex flex-col overflow-hidden ${dark ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-gray-200'}`}>
                                <div className={`border-b p-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50/50'}`}>
                                    <div className="flex gap-1">
                                        <div className={`px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap text-sm cursor-default ${dark ? 'bg-teal-500/10 text-teal-400' : 'bg-indigo-50/80 text-indigo-600'}`}>
                                            <FileText className="w-4 h-4" />
                                            Instructions
                                        </div>
                                        <div className={`px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap text-sm cursor-default ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            <Sparkles className="w-4 h-4" />
                                            Skills
                                        </div>
                                        <div className={`px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap text-sm cursor-default ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            <Zap className="w-4 h-4" />
                                            Triggers
                                        </div>
                                        <div className={`px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap text-sm cursor-default ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            <Wrench className="w-4 h-4" />
                                            Tools
                                        </div>
                                        <div className={`px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap text-sm cursor-default ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            <Brain className="w-4 h-4" />
                                            Knowledge
                                        </div>
                                    </div>
                                </div>
                                <div className={`p-6 flex-1 relative ${dark ? 'bg-[#0A0A0A]' : 'bg-white'}`}>
                                    <div className="max-w-prose">
                                        <div className="mb-4">
                                            <h4 className={`text-sm font-semibold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>System Prompt</h4>
                                            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-500'}`}>The core instructions guiding {agentState.name}'s behavior.</p>
                                        </div>
                                        <div className={`border rounded-lg p-5 h-56 overflow-hidden relative shadow-sm ${dark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                            <p className={`text-[13px] font-mono leading-relaxed whitespace-pre-wrap ${dark ? 'text-teal-400' : 'text-gray-600'}`}>
                                                You are {agentState.name}, a highly skilled {agentState.role}.
                                                {'\n\n'}Your core capabilities include:
                                                {agentState.capabilities.map(c => `\n- ${c}`)}
                                                {'\n\n'}Always follow clean code principles, write fully-tested modules, provide inline JSDoc-style documentation, proactively flag anti-patterns, and suggest architectural improvements when applicable.
                                            </p>
                                            <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t to-transparent ${dark ? 'from-[#0A0A0A]' : 'from-gray-50'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default AgentBuilderSimulation;
