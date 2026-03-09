"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useSpring } from "framer-motion";
import { Brain, Database, Layers, Shield, Server } from "lucide-react";

// Standardized 0-100 coordinate space
const nodes = [
    { id: "memory", label: "Persistent Memory", icon: Database, x: 20, y: 30, color: "#6366f1" },
    { id: "planning", label: "Adaptive Planning", icon: Layers, x: 80, y: 30, color: "#a855f7" },
    { id: "security", label: "Role-Based Security", icon: Shield, x: 20, y: 70, color: "#10b981" },
    { id: "tools", label: "Tool Registry", icon: Server, x: 80, y: 70, color: "#f59e0b" },
];

export function CognitiveArchitectureTree() {
    const containerRef = useRef<HTMLDivElement>(null);

    // We can keep mouse interaction for subtle parallax if desired, 
    // but for now let's focus on the robust connection lines.

    return (
        <div ref={containerRef} className="relative w-full h-[600px] bg-[#050505] rounded-3xl border border-white/5 overflow-hidden group">
            {/* Dynamic Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />

            {/* Connection Lines - RESPONSIVE SCALING FIX: viewBox="0 0 100 100" with preserveAspectRatio="none" */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    {/* Gradients */}
                    {nodes.map(node => (
                        <linearGradient key={node.id} id={`grad-${node.id}`} x1="50%" y1="50%" x2={`${node.x}%`} y2={`${node.y}%`}>
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                            <stop offset="100%" stopColor={node.color} stopOpacity="0.2" />
                        </linearGradient>
                    ))}
                </defs>

                {nodes.map((node) => (
                    <g key={node.id}>
                        {/* 
                           Straight connection line from center (50,50) to node (x,y). 
                           We use vector-effect="non-scaling-stroke" so line width stays constant even if SVG stretches.
                        */}
                        <line
                            x1="50" y1="50"
                            x2={node.x} y2={node.y}
                            stroke={`url(#grad-${node.id})`}
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                            strokeDasharray="5 5"
                            className="animate-dash-flow"
                        />

                        {/* Duplicate line for glow */}
                        <line
                            x1="50" y1="50"
                            x2={node.x} y2={node.y}
                            stroke={node.color}
                            strokeWidth="0.2"
                            strokeOpacity="0.5"
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                ))}
            </svg>

            {/* Central Core Brain */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/50 blur-[50px] rounded-full animate-pulse" />
                    <div className="w-32 h-32 bg-[#0A0A0A] rounded-full border border-indigo-500/50 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                        <Brain size={48} className="text-indigo-400" />
                    </div>
                </div>
                <div className="mt-6 text-center">
                    <div className="text-lg font-bold text-white">Neural Core</div>
                    <div className="text-xs text-indigo-400 font-mono">v2.4.0 Active</div>
                </div>
            </div>

            {/* Branch Nodes - HTML Positioned exactly at same % as SVG */}
            {nodes.map((node) => (
                <motion.div
                    key={node.id}
                    className="absolute z-10"
                    style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        x: "-50%",
                        y: "-50%"
                    }}
                    whileHover={{ scale: 1.05 }}
                >
                    <div className="relative group cursor-pointer">
                        {/* Glow on Hover */}
                        <div className="absolute inset-0 bg-current blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" style={{ color: node.color }} />

                        <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl w-64 shadow-xl group-hover:border-white/20 transition-all">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${node.color}20` }}>
                                <node.icon size={20} style={{ color: node.color }} />
                            </div>
                            <h3 className="text-white font-semibold mb-2">{node.label}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                {node.id === 'memory' && "Maintains context across sessions with vector database integration."}
                                {node.id === 'planning' && "Decomposes complex objectives into executable step-by-step logic."}
                                {node.id === 'security' && "Granular permission scopes and maneuver boundary enforcement."}
                                {node.id === 'tools' && "Seamless API connections to external databases and services."}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}

            <style jsx>{`
                @keyframes dash-flow {
                    from { stroke-dashoffset: 20; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-dash-flow {
                    animation: dash-flow 1s linear infinite;
                }
            `}</style>

            {/* Intro Text / Header inside the interactive component */}
            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
                <h3 className="text-sm font-mono text-indigo-400 opacity-70">INTERACTIVE NEURAL MAP</h3>
            </div>
        </div>
    );
}
