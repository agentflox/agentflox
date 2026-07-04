"use client";
import React, { useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Layers, Users, Cpu, Briefcase, Sparkles, SlidersHorizontal } from 'lucide-react';

export const MarketplaceBrowser = () => {
    // Current filter state to showcase active categorization
    const [activeCategory, setActiveCategory] = useState<'all' | 'assets' | 'human'>('all');

    // High-performance motion values for cursor tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
    };

    const decorativeNodes = [
        { x: 0, y: 0, type: 'blue', category: 'human' },       // 0: Center
        // Inner cluster
        { x: 16, y: 5, type: 'silver', category: 'assets' },    // 1
        { x: 8, y: -14, type: 'blue', category: 'assets' },     // 2
        { x: -10, y: -12, type: 'silver', category: 'human' }, // 3
        { x: -17, y: 4, type: 'blue', category: 'assets' },     // 4
        { x: -6, y: 16, type: 'silver', category: 'human' },   // 5
        { x: 10, y: 13, type: 'blue', category: 'assets' },     // 6
        // Mid ring
        { x: 32, y: -3, type: 'blue', category: 'assets' },     // 7
        { x: 25, y: 17, type: 'silver', category: 'human' },   // 8
        { x: 10, y: 24, type: 'silver', category: 'human' },   // 9
        { x: -5, y: 26, type: 'blue', category: 'assets' },     // 10
        { x: -20, y: 20, type: 'silver', category: 'human' },  // 11
        { x: -30, y: 8, type: 'silver', category: 'assets' },  // 12
        { x: -30, y: -10, type: 'blue', category: 'assets' },   // 13
        { x: -18, y: -20, type: 'silver', category: 'human' }, // 14
        { x: 0, y: -24, type: 'silver', category: 'assets' },   // 15
        { x: 18, y: -20, type: 'blue', category: 'human' },    // 16
        { x: 28, y: -14, type: 'silver', category: 'assets' },  // 17
        // Outer ring
        { x: 46, y: 5, type: 'blue', category: 'human' },      // 18
        { x: 38, y: 24, type: 'silver', category: 'human' },   // 19
        { x: 20, y: 34, type: 'silver', category: 'assets' },   // 20
        { x: -5, y: 36, type: 'blue', category: 'human' },     // 21
        { x: -28, y: 30, type: 'silver', category: 'human' },  // 22
        { x: -44, y: 12, type: 'blue', category: 'assets' },    // 23
        { x: -44, y: -10, type: 'silver', category: 'assets' }, // 24
        { x: -28, y: -28, type: 'silver', category: 'human' }, // 25
        { x: -5, y: -34, type: 'blue', category: 'assets' },    // 26
        { x: 22, y: -28, type: 'silver', category: 'human' },  // 27
        { x: 40, y: -18, type: 'blue', category: 'assets' },    // 28
    ];

    const connections = [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
        [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
        [1, 7], [1, 17], [2, 16], [2, 15], [3, 14], [3, 15], [4, 13], [4, 12], [5, 11], [5, 10], [6, 9], [6, 8],
        [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 7],
        [7, 18], [8, 19], [9, 20], [10, 21], [11, 22], [12, 23], [13, 24], [14, 25], [15, 26], [16, 27], [17, 28], [18, 28],
        [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28],
    ];

    const userNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'John', 'Anna', 'Chris', 'Mia', 'Tom', 'Lily', 'James', 'Chloe', 'Ben', 'Zoe', 'Dan', 'Ruby', 'Luke', 'Eva', 'Mark', 'Lucy', 'Paul', 'Sophie', 'Jack', 'Grace', 'Ryan'];

    // Realigned messages matching Workspace Assets vs. Human Network categories
    const messageAssignments: Record<number, { tag: string; text: string; color: string }> = {
        25: { tag: "AGENT CLONE", text: "Cloned verified customer support swarm to local OS.", color: "text-purple-400 bg-purple-500/10" },
        14: { tag: "PROJECT MATCH", text: "Bidding on custom enterprise RAG setup contract.", color: "text-orange-400 bg-orange-500/10" },
        27: { tag: "TALENT HIRE", text: "Looking for a specialized fine-tuning engineer.", color: "text-cyan-400 bg-cyan-500/10" },
        16: { tag: "TEMPLATE", text: "Imported full Agile Sprint management workspace template.", color: "text-emerald-400 bg-emerald-500/10" },
        0: { tag: "TALENT HIRE", text: "Need an on-demand prompt designer to optimize workflows.", color: "text-cyan-400 bg-cyan-500/10" },
        7: { tag: "TEMPLATE", text: "Listed standard zero-code web scraping workspace pipeline.", color: "text-emerald-400 bg-emerald-500/10" },
        13: { tag: "AGENT CLONE", text: "Cloned autonomous OCR data extraction swarm.", color: "text-purple-400 bg-purple-500/10" },
        19: { tag: "PROJECT MATCH", text: "Available for automated CRM cleansing projects.", color: "text-orange-400 bg-orange-500/10" },
        21: { tag: "TALENT HIRE", text: "Retained an external agent deployment squad.", color: "text-cyan-400 bg-cyan-500/10" },
        22: { tag: "TEMPLATE", text: "Deployed multi-platform financial analysis templates.", color: "text-emerald-400 bg-emerald-500/10" },
    };

    const renderSpheres = () => {
        return decorativeNodes.map((node, i) => {
            const messageData = messageAssignments[i as keyof typeof messageAssignments] || null;

            // Check visibility filter
            const isDimmed = activeCategory !== 'all' && node.category !== activeCategory;

            return (
                <div
                    key={`sphere-${i}`}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-all duration-500"
                    style={{
                        left: `${50 + node.x}%`,
                        top: `${50 + node.y}%`,
                        opacity: isDimmed ? 0.15 : 1,
                        filter: isDimmed ? 'grayscale(80%)' : 'none',
                        pointerEvents: isDimmed ? 'none' : 'auto'
                    }}
                >
                    {/* Animated Chat Bubble */}
                    {messageData && (
                        <motion.div
                            className="absolute bottom-full mb-3 whitespace-nowrap bg-[#0F1115]/90 backdrop-blur-md text-gray-200 text-[11px] font-medium px-3.5 py-2.5 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] pointer-events-none origin-bottom flex flex-col gap-1 border border-white/10"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8], y: [10, 0, 0, -10] }}
                            transition={{ duration: 8, repeat: Infinity, delay: (i % 5) * 1.8, times: [0, 0.1, 0.9, 1] }}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase border border-white/5 ${messageData.color}`}>
                                    {messageData.tag}
                                </span>
                            </div>
                            <span className="tracking-wide text-gray-300">{messageData.text}</span>
                            <div className="absolute top-[98%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#0F1115]"></div>
                        </motion.div>
                    )}

                    {/* Name Tag */}
                    <div className="bg-[#1A1C23]/80 backdrop-blur-md text-[9px] font-semibold text-gray-400 px-2 py-0.5 rounded shadow-sm uppercase tracking-widest border border-white/5 relative z-10">
                        {userNames[i % userNames.length]}
                    </div>

                    {/* Avatar */}
                    <div className="rounded-full border-[1.5px] border-[#2A2D35] bg-black shadow-xl overflow-hidden relative z-10 transition-all duration-300 hover:scale-110 hover:border-gray-400 cursor-pointer"
                        style={{
                            width: node.type === 'blue' ? '36px' : '28px',
                            height: node.type === 'blue' ? '36px' : '28px',
                            boxShadow: node.type === 'blue' ? '0 0 20px rgba(59, 130, 246, 0.15)' : '0 0 15px rgba(255, 255, 255, 0.05)'
                        }}
                    >
                        <img src={`https://i.pravatar.cc/100?img=${10 + (i % 50)}`} alt={userNames[i % userNames.length]} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            )
        })
    }

    return (
        <section id="marketplace" className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#030303]">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="max-w-5xl mx-auto mb-12 text-center flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium mb-8">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">A thriving global ecosystem.</span> Tap into a live network of AI agents, digital assets, and expert talent directly from your workspace.
                    </h2>

                    <motion.button
                        onMouseMove={handleMouseMove}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative px-8 py-3.5 rounded-lg bg-[#0A0A0A] border border-white/10 overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.25)]"
                    >
                        <motion.div
                            className="absolute inset-0 z-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                            style={{
                                background: useMotionTemplate`radial-gradient(110px circle at ${mouseX}px ${mouseY}px, rgba(6, 182, 212, 0.2), transparent 50%)`
                            }}
                        />
                        <span className="relative z-10 flex items-center gap-2 font-semibold text-sm tracking-wide text-gray-300 transition-colors duration-300">
                            <span className="group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-500">
                                Open Browser
                            </span>
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-all duration-300 text-gray-500 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    </motion.button>
                </div>

                {/* Main Visual Container */}
                <div className="w-full relative min-h-[780px] rounded-3xl overflow-hidden mt-6 bg-[#050505] border border-white/5 shadow-[0_0_60px_rgba(255,255,255,0.01)] flex flex-col">

                    {/* INTEGRATED ECOSYSTEM FILTER BAR — Anchored at top of browser to reconcile the split */}
                    <div className="w-full border-b border-white/5 bg-[#0A0A0A]/60 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-30 relative">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <SlidersHorizontal size={14} className="text-cyan-400" />
                            <span>Ecosystem Feed</span>
                        </div>

                        {/* Interactive Toggles */}
                        <div className="flex bg-black border border-white/10 rounded-lg p-0.5">
                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeCategory === 'all' ? 'bg-[#151515] text-white border border-white/10' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Sparkles size={12} /> Global Network
                            </button>
                            <button
                                onClick={() => setActiveCategory('assets')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeCategory === 'assets' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-cyan-400'}`}
                            >
                                <Cpu size={12} /> Workspace Assets
                            </button>
                            <button
                                onClick={() => setActiveCategory('human')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeCategory === 'human' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:text-indigo-400'}`}
                            >
                                <Users size={12} /> Talents & Projects
                            </button>
                        </div>

                        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>14,204 nodes actively trading</span>
                        </div>
                    </div>

                    {/* NETWORK GRAPH LAYOUT CONTAINER */}
                    <div className="flex-1 w-full relative min-h-[650px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,29,43,0.35)_0%,rgba(5,5,5,1)_100%)]" />

                        {/* Earth Globe Wireframe */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.025] z-0 overflow-hidden mix-blend-screen">
                            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="w-full h-full scale-110" stroke="#ffffff" strokeWidth="0.1" fill="none">
                                <circle cx="50" cy="50" r="48" />
                                <ellipse cx="50" cy="50" rx="48" ry="12" />
                                <ellipse cx="50" cy="50" rx="48" ry="24" />
                                <ellipse cx="50" cy="50" rx="48" ry="36" />
                                <ellipse cx="50" cy="50" rx="12" ry="48" />
                                <ellipse cx="50" cy="50" rx="24" ry="48" />
                                <ellipse cx="50" cy="50" rx="36" ry="48" />
                                <path d="M 2 50 L 98 50" />
                                <path d="M 50 2 L 50 98" />
                            </svg>
                        </div>

                        {/* Fiber Optic Connections */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {connections.map(([i, j], idx) => {
                                const n1 = decorativeNodes[i];
                                const n2 = decorativeNodes[j];
                                const x1 = 50 + n1.x; const y1 = 50 + n1.y;
                                const x2 = 50 + n2.x; const y2 = 50 + n2.y;

                                const isConnectionDimmed = activeCategory !== 'all' && (n1.category !== activeCategory || n2.category !== activeCategory);

                                const pathData = `M ${x1} ${y1} Q ${x1 + (x2 - x1) * 0.5 - (y2 - y1) * 0.15} ${y1 + (y2 - y1) * 0.5 + (x2 - x1) * 0.15} ${x2} ${y2}`;

                                return (
                                    <path
                                        key={`c-${idx}`}
                                        d={pathData}
                                        stroke={activeCategory === 'all' ? "#ffffff" : activeCategory === 'assets' ? "#22d3ee" : "#818cf8"}
                                        strokeWidth="0.6"
                                        strokeOpacity={isConnectionDimmed ? "0.03" : "0.15"}
                                        fill="none"
                                        vectorEffect="non-scaling-stroke"
                                        className="transition-all duration-500"
                                    />
                                )
                            })}
                        </svg>

                        {/* Render Avatars and Integrated Chat Bubbles */}
                        {renderSpheres()}
                    </div>
                </div>
            </div>
        </section>
    );
};