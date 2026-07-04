"use client";
import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

export const MarketplaceBrowser = () => {
    // High-performance motion values for cursor tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
    };

    const decorativeNodes = [
        { x: 0, y: 0, type: 'blue' },       // 0: Center

        // Inner cluster (compact)
        { x: 16, y: 5, type: 'silver' },    // 1
        { x: 8, y: -14, type: 'blue' },     // 2
        { x: -10, y: -12, type: 'silver' }, // 3
        { x: -17, y: 4, type: 'blue' },     // 4
        { x: -6, y: 16, type: 'silver' },   // 5
        { x: 10, y: 13, type: 'blue' },     // 6

        // Mid ring — wide ellipse, rx≈32, ry≈20
        { x: 32, y: -3, type: 'blue' },     // 7  right
        { x: 25, y: 17, type: 'silver' },   // 8  lower-right
        { x: 10, y: 24, type: 'silver' },   // 9  bottom-right
        { x: -5, y: 26, type: 'blue' },     // 10 bottom
        { x: -20, y: 20, type: 'silver' },  // 11 bottom-left
        { x: -30, y: 8, type: 'silver' },   // 12 left
        { x: -30, y: -10, type: 'blue' },   // 13 upper-left
        { x: -18, y: -20, type: 'silver' }, // 14 top-left
        { x: 0, y: -24, type: 'silver' },   // 15 top
        { x: 18, y: -20, type: 'blue' },    // 16 upper-right
        { x: 28, y: -14, type: 'silver' },  // 17 right-upper

        // Outer sparse ring — wide ellipse, rx≈46, ry≈30, organic
        { x: 46, y: 5, type: 'blue' },      // 18 far right
        { x: 38, y: 24, type: 'silver' },   // 19 lower-far-right
        { x: 20, y: 34, type: 'silver' },   // 20 far-bottom-right
        { x: -5, y: 36, type: 'blue' },     // 21 far bottom
        { x: -28, y: 30, type: 'silver' },  // 22 far-bottom-left
        { x: -44, y: 12, type: 'blue' },    // 23 far left
        { x: -44, y: -10, type: 'silver' }, // 24 far-upper-left
        { x: -28, y: -28, type: 'silver' }, // 25 upper-left
        { x: -5, y: -34, type: 'blue' },    // 26 far top
        { x: 22, y: -28, type: 'silver' },  // 27 upper-right
        { x: 40, y: -18, type: 'blue' },    // 28 right-upper-far
    ];

    const connections = [
        // Center to inner
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
        // Inner hexagon
        [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
        // Inner to mid
        [1, 7], [1, 17], [2, 16], [2, 15], [3, 14], [3, 15], [4, 13], [4, 12], [5, 11], [5, 10], [6, 9], [6, 8],
        // Mid ring
        [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 7],
        // Mid to outer
        [7, 18], [8, 19], [9, 20], [10, 21], [11, 22], [12, 23], [13, 24], [14, 25], [15, 26], [16, 27], [17, 28], [18, 28],
        // Outer ring
        [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28],
    ];

    const userNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'John', 'Anna', 'Chris', 'Mia', 'Tom', 'Lily', 'James', 'Chloe', 'Ben', 'Zoe', 'Dan', 'Ruby', 'Luke', 'Eva', 'Mark', 'Lucy', 'Paul', 'Sophie', 'Jack', 'Grace', 'Ryan'];

    const messageAssignments: Record<number, string> = {
        // Top-left quadrant
        25: "I want an AI agent to handle sales.",
        14: "I want to find a RAG project.",
        // Top-right quadrant
        27: "Can someone optimize my LLM?",
        16: "Looking for an AI content creator.",
        // Center
        0: "Need a prompt engineer for my team.",
        // Center-right
        7: "Who can build a scraping pipeline?",
        // Center-left
        13: "Looking for an OCR API tool.",
        // Bottom-right
        19: "Looking for a CRM data cleansing task.",
        // Bottom
        21: "Need a growth marketing squad.",
        // Bottom-left
        22: "I want to deploy a support swarm.",
    };

    const renderSpheres = () => {
        return decorativeNodes.map((node, i) => {
            const message = messageAssignments[i as keyof typeof messageAssignments] || null;

            return (
                <div key={`sphere-${i}`} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
                    style={{
                        left: `${50 + node.x}%`,
                        top: `${50 + node.y}%`,
                    }}
                >
                    {/* Animated Chat Bubble - Premium Glassmorphism */}
                    {message && (
                        <motion.div
                            className="absolute bottom-full mb-3 whitespace-nowrap bg-[#0F1115]/80 backdrop-blur-md text-gray-200 text-[11px] font-medium px-3.5 py-2 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.6)] pointer-events-none origin-bottom flex items-center gap-2.5 border border-white/10"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8], y: [10, 0, 0, -10] }}
                            transition={{ duration: 7, repeat: Infinity, delay: (i % 5) * 1.5, times: [0, 0.1, 0.9, 1] }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                            <span className="tracking-wide">{message}</span>
                            {/* Premium muted triangle tail */}
                            <div className="absolute top-[98%] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#0F1115]"></div>
                        </motion.div>
                    )}

                    {/* Name Tag - Minimalist dark mode */}
                    <div className="bg-[#1A1C23]/80 backdrop-blur-md text-[9px] font-semibold text-gray-400 px-2 py-0.5 rounded shadow-sm uppercase tracking-widest border border-white/5 relative z-10">
                        {userNames[i % userNames.length]}
                    </div>

                    {/* Avatar - High end borders and glow */}
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
        <section
            id="marketplace"
            className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#030303]"
        >
            {/* Top ambient highlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="max-w-5xl mx-auto mb-16 text-center flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight text-[#8A8F98] font-medium mb-10">
                        <span className="text-gray-100 font-semibold">Interconnected intelligence.</span> Access a unified network of agents, tasks, talent, and resources mapped perfectly into your workflow.
                    </h2>

                    {/* Enterprise Call To Action Button w/ Cursor Spotlight */}
                    <motion.button
                        onMouseMove={handleMouseMove}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative px-8 py-3.5 rounded-lg bg-[#0A0A0A] border border-white/10 overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.25)]"
                    >
                        {/* Dynamic Cursor-Tracking Glow Effect */}
                        <motion.div
                            className="absolute inset-0 z-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                            style={{
                                background: useMotionTemplate`radial-gradient(110px circle at ${mouseX}px ${mouseY}px, rgba(139, 92, 246, 0.25), transparent 50%)`
                            }}
                        />

                        {/* Content Container */}
                        <span className="relative z-10 flex items-center gap-2 font-semibold text-sm tracking-wide text-gray-300 transition-colors duration-300">
                            {/* Gradient Text on Hover */}
                            <span className="group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all duration-500">
                                Explore Marketplace
                            </span>
                            <svg
                                className="w-4 h-4 transform group-hover:translate-x-1 transition-all duration-300 text-gray-500 group-hover:text-purple-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </span>
                    </motion.button>
                </div>

                <div className="w-full relative min-h-[750px] rounded-3xl overflow-hidden mt-12 bg-[#050505] shadow-[0_0_60px_rgba(255,255,255,0.02)]">

                    {/* NETWORK BACKGROUND - Deep subtle glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,30,45,0.4)_0%,rgba(5,5,5,1)_100%)]" />

                    {/* Earth Globe Wireframe Background - Inverted for Dark Mode */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden mix-blend-screen">
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

                    {/* SVG Lines - Thin, Precise Fiber Optics */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {connections.map(([i, j], idx) => {
                            const n1 = decorativeNodes[i];
                            const n2 = decorativeNodes[j];
                            const x1 = 50 + n1.x; const y1 = 50 + n1.y;
                            const x2 = 50 + n2.x; const y2 = 50 + n2.y;

                            const pathData = `M ${x1} ${y1} Q ${x1 + (x2 - x1) * 0.5 - (y2 - y1) * 0.15} ${y1 + (y2 - y1) * 0.5 + (x2 - x1) * 0.15} ${x2} ${y2}`;

                            return (
                                <path
                                    key={`c-${idx}`}
                                    d={pathData}
                                    stroke="#ffffff"
                                    strokeWidth="0.6"
                                    strokeOpacity="0.15"
                                    fill="none"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )
                        })}
                    </svg>

                    {/* Render All Avatars and Chat Bubbles */}
                    {renderSpheres()}
                </div>
            </div>
        </section>
    );
};