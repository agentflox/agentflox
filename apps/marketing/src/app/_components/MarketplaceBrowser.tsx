"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Briefcase, Users, MapPin, ArrowRight, TrendingUp, Code2, LineChart, Megaphone, MonitorSmartphone, Database, MessageSquare } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const MarketplaceBrowser = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [cycleCount, setCycleCount] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);

    const placeholderText = "Search projects, skills, or opportunities...";
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    // EXPANDED CATEGORIES FOR BETTER BALANCE
    const categories = [
        { name: 'Development', icon: Code2, color: 'from-blue-500 to-cyan-500' },
        { name: 'Business', icon: Building2, color: 'from-purple-500 to-indigo-500' },
        { name: 'Marketing', icon: Megaphone, color: 'from-pink-500 to-rose-500' },
        { name: 'Design', icon: MonitorSmartphone, color: 'from-orange-500 to-amber-500' },
        { name: 'Finance', icon: LineChart, color: 'from-emerald-500 to-green-500' },
        { name: 'Data', icon: Database, color: 'from-cyan-500 to-sky-500' },
        { name: 'AI Services', icon: MessageSquare, color: 'from-violet-500 to-purple-500' },
        { name: 'Teams', icon: Users, color: 'from-indigo-500 to-blue-500' },
        { name: 'Positions', icon: Briefcase, color: 'from-slate-500 to-gray-500' },
    ];

    const sampleProjects = [
        { title: 'AI-Powered Analytics Platform', category: 'Technology', trending: true },
        { title: 'Sustainable Energy Solution', category: 'Energy', trending: false },
        { title: 'Healthcare Innovation Hub', category: 'Healthcare', trending: true },
        { title: 'FinTech Payment Gateway', category: 'Finance', trending: false },
    ];

    // Scroll-triggered animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            if (!hasAnimated && sectionRef.current) {
                gsap.fromTo('.category-card',
                    { opacity: 0, scale: 0.8, rotation: -5 },
                    {
                        opacity: 1,
                        scale: 1,
                        rotation: 0,
                        duration: 0.6,
                        stagger: 0.05,
                        ease: 'back.out(1.7)',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 75%',
                            toggleActions: 'play none none reverse'
                        }
                    }
                );
                setHasAnimated(true);
            }
        }, sectionRef);

        return () => ctx.revert();
    }, [hasAnimated]);

    // Typing animation cycle
    useEffect(() => {
        if (isTyping && currentIndex < placeholderText.length) {
            const timeout = setTimeout(() => {
                setDisplayText(placeholderText.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, 100);
            return () => clearTimeout(timeout);
        } else if (currentIndex >= placeholderText.length && isTyping) {
            setTimeout(() => {
                setIsTyping(false);
                setIsLoading(true);
                setTimeout(() => {
                    setIsLoading(false);
                    setShowResults(true);
                    setTimeout(() => {
                        setShowResults(false);
                        setDisplayText('');
                        setCurrentIndex(0);
                        setIsTyping(true);
                        setCycleCount(prev => prev + 1);
                    }, 4000); // Increased result display time
                }, 1500);
            }, 500);
        }
    }, [currentIndex, isTyping, placeholderText.length]);

    return (
        <section
            ref={sectionRef}
            id="marketplace"
            className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#030303]"
        >
            {/* Background Elements */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                {/* Section Header */}
                <div className="max-w-3xl mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm">
                        <Briefcase size={12} />
                        Global Marketplace
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        Browse To Find Endless <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                            Opportunities.
                        </span>
                    </h2>
                    <p className="text-gray-400 text-lg font-light leading-relaxed max-w-xl">
                        Discover projects, connect with teams, and explore opportunities across industries in a unified ecosystem.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Categories Grid - EXPANDED */}
                    <div className="bg-[#080808] p-8 rounded-2xl border border-white/5 h-full">
                        <h3 className="text-2xl font-semibold text-white mb-6">Explore Categories</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {categories.map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={i}
                                        className="category-card group relative p-6 rounded-xl bg-zinc-900 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer shadow-lg"
                                    >
                                        <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                            <div className={`p-3 rounded-lg bg-zinc-800 mb-3 group-hover:bg-gradient-to-br ${item.color} group-hover:text-white transition-all duration-300 shadow-inner`}>
                                                <Icon size={24} className="text-gray-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="text-sm font-medium text-gray-200 group-hover:text-white">{item.name}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Marketplace Browser */}
                    <div className="bg-[#080808] p-8 rounded-2xl border border-white/5 h-full min-h-[500px] flex flex-col">
                        <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-md">
                                <Search size={20} className="text-indigo-400" />
                            </div>
                            Marketplace Browser
                        </h3>

                        {/* Search Input */}
                        <div className="mb-6">
                            <div className="relative flex items-center gap-3 bg-[#030303] p-4 rounded-lg border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                                <Search size={20} className="text-gray-500 flex-shrink-0" />
                                <div className="flex-1 bg-transparent border-none outline-none text-white text-sm font-mono h-5 flex items-center">
                                    {displayText}
                                    {isTyping && <span className="w-1.5 h-4 bg-indigo-500 animate-pulse ml-0.5" />}
                                </div>

                                <button
                                    className="px-4 py-2 bg-white text-black rounded-sm font-medium text-sm hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    disabled={isTyping}
                                >
                                    Search
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 relative">
                            {/* Loading State - GRID LAYOUT */}
                            {isLoading && (
                                <div className="grid grid-cols-2 gap-4 animate-pulse">
                                    {[1, 2, 3, 4].map((n) => (
                                        <div key={n} className="p-4 bg-[#0A0A0A] rounded-xl border border-white/20 flex flex-col gap-4 h-full">
                                            <div className="flex items-start justify-between">
                                                <div className="w-10 h-10 rounded bg-zinc-700" />
                                                <div className="w-6 h-6 rounded-full bg-zinc-700" />
                                            </div>
                                            <div className="space-y-2 mt-auto">
                                                <div className="h-4 w-full bg-zinc-600 rounded" />
                                                <div className="h-3 w-2/3 bg-zinc-700 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Results - GRID LAYOUT */}
                            <AnimatePresence mode="wait">
                                {showResults && (
                                    <motion.div
                                        key={cycleCount}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                    >
                                        {sampleProjects.map((project, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1, duration: 0.3 }}
                                                className="p-4 bg-[#0A0A0A] rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 group cursor-pointer flex flex-col h-full hover:-translate-y-1"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-2 rounded-lg bg-white/5 ${project.trending ? 'text-indigo-400' : 'text-gray-400'} group-hover:text-white transition-colors`}>
                                                        {/* Placeholder icon since we don't have per-project icons in data yet */}
                                                        <Search size={20} />
                                                    </div>
                                                    {project.trending && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono rounded-full border border-indigo-500/20">
                                                            <TrendingUp size={10} />
                                                            Trending
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-auto">
                                                    <h4 className="text-white font-medium group-hover:text-indigo-300 transition-colors mb-1 line-clamp-2 leading-tight">
                                                        {project.title}
                                                    </h4>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-gray-500 text-xs font-mono">{project.category}</p>
                                                        <ArrowRight size={14} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Empty state (when just searching) - MAX VISIBILITY FIX */}
                            {!isLoading && !showResults && (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 text-sm font-mono">
                                    <div className="w-16 h-16 mb-4 rounded-full border border-white/20 flex items-center justify-center bg-white/5">
                                        <Search size={24} className="text-gray-400" />
                                    </div>
                                    Start typing to search the marketplace...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
