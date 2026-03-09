"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Globe, LayoutGrid, TrendingUp, ArrowRight } from "lucide-react";
import { ROUTES } from '../../lib/config';

const features = [
    {
        id: "ai-agents",
        title: "AI Multi-Agents & Collaboration",
        description: "Orchestrate a workforce of autonomous AI agents that collaborate with your human team. Automate complex workflows, share context, and execute tasks with human-in-the-loop control.",
        icon: Bot,
        image: "/images/feature-ai.png",
        color: "indigo"
    },
    {
        id: "marketplace",
        title: "Global Marketplace",
        description: "Access a thriving ecosystem of pre-built agents, templates, and skills. Instantly deploy specialized capabilities to your workspace.",
        icon: Globe,
        image: "/images/feature-marketplace.png",
        color: "cyan"
    },
    {
        id: "project-mgmt",
        title: "Project Management with AI",
        description: "Experience the next evolution of project management. AI anticipates risks, suggests resource allocation, and automates status updates.",
        icon: LayoutGrid,
        image: "/images/feature-pm.png",
        color: "violet"
    },
    {
        id: "business-value",
        title: "Empowering Every Business",
        description: "Drive efficiency and innovation across your entire organization. From startups to enterprises, Agentflox scales with your ambition.",
        icon: TrendingUp,
        image: "/images/feature-business.png",
        color: "fuchsia"
    }
];

export const PreviewSection = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const [progress, setProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-rotate features
    useEffect(() => {
        if (!isAutoPlaying) return;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    setActiveFeature((current) => (current + 1) % features.length);
                    return 0;
                }
                return prev + 0.4;
            });
        }, 50);

        return () => clearInterval(timer);
    }, [activeFeature, isAutoPlaying]);

    const handleFeatureClick = (index: number) => {
        setActiveFeature(index);
        setProgress(0);
        setIsAutoPlaying(false);
    };

    return (
        <section ref={containerRef} className="relative w-full h-screen min-h-[800px] flex flex-col justify-center py-10 px-4 sm:px-10 lg:px-20 bg-[#030303] overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505] to-[#030303]" />
            <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Main Container */}
            <div className="relative max-w-7xl mx-auto w-full z-10 flex flex-col h-full justify-center">

                {/* Header Section - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 lg:mb-8 shrink-0">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 self-start backdrop-blur-sm">
                            Core Capabilities
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                            The Operating System for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300">
                                Modern Ventures
                            </span>
                        </h2>
                        <p className="text-gray-400 text-base font-light max-w-lg">
                            Everything you need to build, manage, and scale your business with the power of artificial intelligence.
                        </p>
                    </div>
                    {/* Empty Right Side for Header Row */}
                    <div className="hidden lg:block"></div>
                </div>

                {/* Main Content Grid - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 flex-1 min-h-0">

                    {/* Left Side: Accordion/List - Scrollable if needed but intended to fit */}
                    <div className="flex flex-col gap-3 lg:pr-4 overflow-y-auto no-scrollbar">
                        <div className="space-y-3">
                            {features.map((feature, index) => {
                                const isActive = activeFeature === index;
                                const Icon = feature.icon;

                                return (
                                    <div
                                        key={feature.id}
                                        onClick={() => handleFeatureClick(index)}
                                        className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm
                                        ${isActive
                                                ? "bg-white/5 border-white/10 shadow-xl"
                                                : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                                            }`}
                                    >
                                        {/* Progress Bar Background for Active Item */}
                                        {isActive && isAutoPlaying && (
                                            <div className="absolute bottom-0 left-0 h-[1.5px] bg-gradient-to-r from-indigo-500 to-purple-500 z-10 transition-all duration-75" style={{ width: `${progress}%` }} />
                                        )}

                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg transition-colors duration-300 ${isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-gray-500 group-hover:text-gray-300"}`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className={`text-lg font-semibold mb-1 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                                                    {feature.title}
                                                </h3>

                                                <AnimatePresence>
                                                    {isActive && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <p className="text-gray-400 leading-relaxed mb-3 font-light text-sm">
                                                                {feature.description}
                                                            </p>
                                                            <Link href={ROUTES.SIGNUP}>
                                                                <button className="text-xs font-medium text-indigo-300 hover:text-indigo-200 flex items-center gap-1.5 group/btn">
                                                                    Get Started
                                                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                                </button>
                                                            </Link>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side: Image Preview */}
                    {/* Compact Image Container with negative top margin */}
                    <div className="relative hidden lg:flex lg:flex-col lg:h-full lg:max-h-[500px] w-full lg:-mt-28">
                        {/* Floating Glows */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/10 blur-[100px] rounded-full -z-10" />

                        <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A0A0A] group">
                            {/* Header Bar Mockup */}
                            <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 border-b border-white/5 flex items-center px-3 gap-1.5 z-20 backdrop-blur-md">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                    <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/50" />
                                </div>
                                <div className="w-32 h-3 bg-white/5 rounded-full ml-3" />
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeFeature}
                                    initial={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute inset-0 pt-6 bg-[#050505]"
                                >
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={features[activeFeature].image}
                                            alt={features[activeFeature].title}
                                            fill
                                            className="object-cover object-center"
                                            priority
                                        />

                                        {/* Cinematic overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent opacity-20 pointer-events-none" />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Mobile Image */}
                    <div className="relative flex lg:hidden items-center justify-center mt-6">
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A0A0A]">
                            <Image
                                src={features[activeFeature].image}
                                alt={features[activeFeature].title}
                                fill
                                className="object-cover object-top"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
