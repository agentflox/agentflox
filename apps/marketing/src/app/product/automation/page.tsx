"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Workflow, Zap, ShieldCheck, Layout, GitBranch, Database, Globe, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function AutomationPage() {
    const triggers = [
        {
            id: 'webhook',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            ),
            name: "Webhook Trigger",
            tag: "Active",
            color: "text-emerald-400",
            iconBg: "bg-emerald-500/10",
            tagStyles: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
            rows: ["POST /api/trigger", "Auth: Bearer token", "Payload: JSON schema v2"]
        },
        {
            id: 'postgres',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
            ),
            name: "Postgres Trigger",
            tag: "Listening",
            color: "text-cyan-400",
            iconBg: "bg-cyan-500/10",
            tagStyles: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]",
            rows: ["Table: leads", "Event: INSERT, UPDATE", "Filter: status = 'new'"]
        },
        {
            id: 'schedule',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            name: "Scheduled Run",
            tag: "Every 1h",
            color: "text-amber-400",
            iconBg: "bg-amber-500/10",
            tagStyles: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            rows: []
        },
    ];
    const diagramVisual = (
        <div className="w-full h-full relative flex items-center justify-center bg-[#02060D] overflow-hidden">
            {/* Dotted Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-full max-w-[800px] aspect-[8/5]"
            >
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500">
                    <defs>
                        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="greenGlow" x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Solid Connections */}
                    <path d="M 110 100 L 170 100" stroke="#00f0ff" strokeWidth="2" fill="none" />
                    <path d="M 250 100 L 310 100" stroke="#00f0ff" strokeWidth="2" fill="none" />
                    <path d="M 490 100 L 550 100" stroke="#00f0ff" strokeWidth="2" fill="none" />
                    <path d="M 630 100 L 690 100" stroke="#00f0ff" strokeWidth="2" fill="none" />

                    {/* Dashed Connections */}
                    <g stroke="#00f0ff" strokeWidth="2" fill="none" strokeDasharray="4 4">
                        <path id="pathMem" d="M 360 140 L 360 175 Q 360 185 350 185 L 260 185 Q 250 185 250 195 L 250 215" />
                        <path id="pathTools" d="M 400 140 L 400 215" />
                        <path id="pathPlan" d="M 440 140 L 440 175 Q 440 185 450 185 L 540 185 Q 550 185 550 195 L 550 215" />
                        <path id="pathObs" d="M 325 130 L 325 150 Q 325 160 315 160 L 150 160 Q 140 160 140 170 L 140 410 Q 140 420 150 420 L 220 420" />
                        <path id="pathEnv" d="M 400 305 L 400 330 Q 400 340 410 340 L 500 340 Q 510 340 510 350 L 510 385" />
                        <path id="pathJoin" d="M 360 420 L 440 420" />
                    </g>

                    {/* Connection Dots */}
                    <g fill="#00ff88" filter="url(#greenGlow)">
                        <circle cx="110" cy="100" r="4" />
                        <circle cx="170" cy="100" r="4" />
                        <circle cx="250" cy="100" r="4" />
                        <circle cx="310" cy="100" r="4" />
                        <circle cx="490" cy="100" r="4" />
                        <circle cx="550" cy="100" r="4" />
                        <circle cx="630" cy="100" r="4" />
                        <circle cx="690" cy="100" r="4" />
                        <circle cx="360" cy="140" r="4" />
                        <circle cx="400" cy="140" r="4" />
                        <circle cx="440" cy="140" r="4" />
                        <circle cx="325" cy="130" r="4" />
                        <circle cx="250" cy="215" r="4" />
                        <circle cx="400" cy="215" r="4" />
                        <circle cx="550" cy="215" r="4" />
                        <circle cx="220" cy="420" r="4" />
                        <circle cx="400" cy="305" r="4" />
                        <circle cx="510" cy="385" r="4" />
                        <circle cx="360" cy="420" r="4" />
                        <circle cx="440" cy="420" r="4" />
                    </g>

                    {/* Traveling Particles */}
                    <circle r="3" fill="#fff" filter="url(#cyanGlow)">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M 360 140 L 360 175 Q 360 185 350 185 L 260 185 Q 250 185 250 195 L 250 215" />
                    </circle>
                    <circle r="3" fill="#fff" filter="url(#cyanGlow)">
                        <animateMotion dur="1.5s" repeatCount="indefinite" path="M 400 140 L 400 215" />
                    </circle>
                    <circle r="3" fill="#fff" filter="url(#cyanGlow)">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M 440 140 L 440 175 Q 440 185 450 185 L 540 185 Q 550 185 550 195 L 550 215" />
                    </circle>
                    <circle r="3" fill="#fff" filter="url(#cyanGlow)">
                        <animateMotion dur="3s" repeatCount="indefinite" path="M 325 130 L 325 150 Q 325 160 315 160 L 150 160 Q 140 160 140 170 L 140 410 Q 140 420 150 420 L 220 420" />
                    </circle>
                    <circle r="3" fill="#fff" filter="url(#cyanGlow)">
                        <animateMotion dur="2s" repeatCount="indefinite" path="M 400 305 L 400 330 Q 400 340 410 340 L 500 340 Q 510 340 510 350 L 510 385" />
                    </circle>

                    {/* Nodes (using foreignObject for crisp HTML rendering) */}

                    {/* Top Row */}
                    <foreignObject x="30" y="60" width="80" height="80">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ffc700] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            User
                        </div>
                    </foreignObject>

                    <foreignObject x="170" y="60" width="80" height="80">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ff4d4d] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Prompt
                        </div>
                    </foreignObject>

                    <foreignObject x="310" y="60" width="180" height="80">
                        <div className="w-full h-full rounded-[40px] border-[2px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-white font-semibold text-lg gap-3 shadow-[0_0_20px_rgba(0,240,255,0.25)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[#00f0ff]/5 group-hover:bg-[#00f0ff]/10 transition-colors" />
                            <div className="relative z-10 w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center">
                                <div className="w-3 h-3 bg-[#00f0ff] rounded-sm absolute top-2 left-2 animate-pulse" />
                            </div>
                            <span className="relative z-10">AI Agent</span>
                        </div>
                    </foreignObject>

                    <foreignObject x="550" y="60" width="80" height="80">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ffc700] font-medium text-[14px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Validation
                        </div>
                    </foreignObject>

                    <foreignObject x="690" y="60" width="80" height="80">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ff4d4d] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Output
                        </div>
                    </foreignObject>

                    {/* Middle Row */}
                    <foreignObject x="205" y="215" width="90" height="90">
                        <div className="w-full h-full rounded-full border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ff4d4d] font-medium text-[14px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Memory
                        </div>
                    </foreignObject>

                    <foreignObject x="355" y="215" width="90" height="90">
                        <div className="w-full h-full rounded-full border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ffc700] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Tools
                        </div>
                    </foreignObject>

                    <foreignObject x="505" y="215" width="90" height="90">
                        <div className="w-full h-full rounded-full border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#00f0ff] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Planner
                        </div>
                    </foreignObject>

                    {/* Bottom Row */}
                    <foreignObject x="220" y="385" width="140" height="70">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#00f0ff] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Observations
                        </div>
                    </foreignObject>

                    <foreignObject x="440" y="385" width="140" height="70">
                        <div className="w-full h-full rounded-2xl border-[1.5px] border-[#00f0ff] bg-[#02060D] flex items-center justify-center text-[#ffc700] font-medium text-[15px] shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                            Environment
                        </div>
                    </foreignObject>

                </svg>
            </motion.div>
        </div>
    );

    return (
        <FeaturePageLayout
            badge="Intelligent Workflows"
            title="Automation that Adapts to Chaos"
            description="Build resilient, self-healing workflows. Traditional automation breaks when data changes—Agentflox's AI agents adapt, retry, and resolve edge cases automatically."
            heroVisual={diagramVisual}
            customMiddleSection={
                <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#030303] relative overflow-hidden border-b border-white/5">
                    <div className="container mx-auto max-w-7xl">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Text */}
                            <div>
                                <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-4">Trigger Anything</p>
                                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-6 leading-[1.1]">
                                    <span className="text-white">Connect your entire stack.</span>{" "}
                                    <span className="text-gray-500">Route automation triggers from every system you already use.</span>
                                </h2>

                                <div className="mt-10 space-y-0 divide-y divide-white/5">
                                    {[
                                        { label: "Webhooks & REST APIs", desc: "Trigger agents instantly from any external system via HTTP events." },
                                        { label: "Database change streams.", desc: "React to new rows, updates, or deletions in Postgres, MySQL, or MongoDB." },
                                        { label: "Scheduling & CRON.", desc: "Run recurring automation on precise intervals — hourly, daily, or custom." },
                                    ].map((item, i) => (
                                        <div key={i} className="group py-6 cursor-pointer">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-white font-semibold text-xl group-hover:text-teal-400 transition-colors">{item.label}</p>
                                                    <p className="text-gray-400 text-base mt-1.5 font-light leading-relaxed">{item.desc}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 h-[1.5px] w-0 group-hover:w-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Visual Card */}
                            <div className="relative group w-full max-w-lg mx-auto lg:mx-0">
                                {/* Ambient Background Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/20 rounded-[2rem] blur-2xl opacity-60 group-hover:opacity-100 transition duration-700" />
                                
                                <div className="relative rounded-2xl border border-white/[0.08] bg-[#0A0D14]/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
                                    
                                    {/* Header: Mac Style Window Controls */}
                                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.01]">
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                                <span className="text-xs text-slate-400 font-mono tracking-wide">automation-triggers.yaml</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>

                                    {/* Content / Trigger Entries */}
                                    <div className="p-4 space-y-4">
                                        {triggers.map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="group/card rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300"
                                            >
                                                {/* Entry Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${item.iconBg} ${item.color} shadow-inner`}>
                                                            {item.icon}
                                                        </div>
                                                        <span className={`text-sm font-medium tracking-wide ${item.color} drop-shadow-md`}>
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border tracking-wide uppercase ${item.tagStyles}`}>
                                                        {item.tag}
                                                    </span>
                                                </div>

                                                {/* Code Snippet Rows */}
                                                {item.rows.length > 0 && (
                                                    <div className="ml-11 space-y-2">
                                                        {item.rows.map((row, j) => (
                                                            <div key={j} className="flex items-center gap-2.5 text-[12px] text-slate-400 font-mono">
                                                                <div className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                                                                {row}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Interactive Mini-Chart (Specifically for Postgres) */}
                                                {item.id === 'postgres' && (
                                                    <div className="mt-5 ml-11 rounded-lg border border-white/[0.04] bg-black/20 p-3 flex items-center justify-between shadow-inner">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Events Processed</span>
                                                            <span className="text-sm text-slate-200 font-mono mt-0.5 tracking-tight">3,196</span>
                                                        </div>
                                                        <div className="flex items-end gap-1 h-6">
                                                            {[40, 75, 50, 100, 65, 85].map((h, k) => (
                                                                <div 
                                                                    key={k} 
                                                                    className="w-1.5 rounded-t-sm bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.6)] group-hover/card:bg-cyan-400 transition-colors duration-300" 
                                                                    style={{ height: `${h}%` }} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }
            features={[

                {
                    title: "Visual Flow Builder",
                    description: "Drag-and-drop interface to design complex agent chains. Visualize dependencies, logic paths, and fallbacks instantly.",
                    icon: Layout
                },
                {
                    title: "Human-in-the-Loop Gates",
                    description: "Set approval thresholds. If an agent's confidence score drops below 90%, it automatically pings a human for review.",
                    icon: ShieldCheck
                },
                {
                    title: "Event-Driven Triggers",
                    description: "Launch workflows from webhooks, database changes, GitHub PRs, or Slack messages. Real-time response to business signals.",
                    icon: Zap
                }
            ]}
            deepDive={{
                title: "From Rigid Scripts to Fluid Logic",
                description: "Old-school automation requires every step to be strictly defined. Agentflox workflows use 'Goal-Oriented' nodes where you define the 'What' and the AI figures out the 'How'.",
                image: "/images/ai-automation.png",
                bullets: [
                    "Dynamic Pathing: AI chooses the best tool for the job at runtime.",
                    "Error Recovery: Agents read error logs and try alternative methods.",
                    "Unstructured Data: Parse PDFs, loose text, and websites effortlessly."
                ]
            }}
        />
    );
}
