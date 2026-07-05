"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, Zap, Play, Layout } from "lucide-react";
import Link from 'next/link';
import { Navigation, Footer, CTASection } from "./";
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

interface FeaturePageProps {
    badge: string;
    title: string;
    description: string;
    heroVisual?: React.ReactNode;
    features: {
        title: string;
        description: string;
        icon: React.ElementType;
    }[];
    stats?: {
        label: string;
        value: string;
        subtext?: string;
    }[];
    customMiddleSection?: React.ReactNode;
    deepDive?: {
        title: string;
        description: string;
        image?: string; // URL or component
        bullets: string[];
    };
    swapVisuals?: boolean;
}

export const FeaturePageLayout = ({ badge, title, description, heroVisual, features, stats, customMiddleSection, deepDive, swapVisuals }: FeaturePageProps) => {
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(".fade-up",
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }
            );
        });
        return () => ctx.revert();
    }, []);

    return (
        <div className="relative min-h-screen text-white overflow-x-hidden bg-[#030303] selection:bg-teal-500/30">
            <AnimatedBackground />
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-white/5">
                <div className="absolute top-0 right-0 w-[60%] h-[600px] bg-teal-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                        {/* Text Content */}
                        <div className="flex-1 max-w-2xl relative">
                            <div className="fade-up inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-8 backdrop-blur-md shadow-lg shadow-teal-500/10">
                                <Zap size={12} className="text-orange-400" />
                                {badge}
                            </div>

                            <h1 className="fade-up text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium mb-8 leading-[1.05] tracking-tighter drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                                {title}
                            </h1>

                            <p className="fade-up text-lg md:text-xl text-gray-400 font-light leading-relaxed mb-10 max-w-xl text-balance drop-shadow-md">
                                {description}
                            </p>

                            <div className="fade-up flex flex-wrap gap-4">
                                <Link
                                    href="/signup"
                                    className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02]"
                                >
                                    <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover:bg-opacity-0 transition-all duration-500 z-0"></div>
                                    <span className="relative z-20 flex items-center gap-3 text-sm font-semibold text-white transition-all duration-300">
                                        Start Free Trial
                                        <ArrowRight size={16} className="text-orange-300 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300" />
                                    </span>
                                </Link>
                                <button className="group px-8 py-4 bg-white/5 text-white font-medium text-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                    <Play size={16} className="text-teal-400" />
                                    Watch Demo
                                </button>
                            </div>

                            {/* Trust / Stats Mini */}
                            <div className="fade-up mt-12 flex items-center gap-6 text-sm text-gray-500 font-medium">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border border-[#030303] ring-2 ring-[#030303] shadow-lg shadow-black/50 overflow-hidden bg-[#111]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User avatar" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <span>Used by 10,000+ innovators</span>
                            </div>
                        </div>

                        {/* Hero Visual - Dynamic & Parallax */}
                        <motion.div className="flex-1 w-full relative perspective-[2000px] group">
                            {/* Glow behind */}
                            <div className="absolute inset-0 bg-teal-600/10 blur-[100px] rounded-3xl -z-10 group-hover:bg-teal-500/20 transition-colors duration-700" />

                            {/* Main Visual Card */}
                            <div className="relative rounded-3xl border border-white/5 bg-[#050505]/90 backdrop-blur-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] overflow-hidden aspect-[4/3] flex items-center justify-center transform transition-transform duration-700 group-hover:scale-[1.02]">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />

                                {swapVisuals && deepDive?.image ? (
                                    <img src={deepDive.image} alt={title} className="relative z-10 w-full h-full object-cover" />
                                ) : (
                                    heroVisual || (
                                        <div className="flex flex-col items-center gap-4 text-gray-700">
                                            <Layout size={64} strokeWidth={1} className="text-teal-900/50" />
                                            <span className="font-mono text-sm uppercase tracking-widest text-teal-900/50">[Product Interface]</span>
                                        </div>
                                    )
                                )}

                                {/* UI Chrome Decor */}
                                <div className="absolute top-4 left-4 right-4 h-10 bg-[#0A0A0A] rounded-xl flex items-center px-4 border border-white/5 shadow-inner">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500/30" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-500/30" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>


            {/* --- SECTION DIVIDER --- */}
            <div className="relative w-full flex justify-center items-center" style={{ height: '120px', marginTop: '-60px', marginBottom: '-60px', zIndex: 20, pointerEvents: 'none' }}>
                <div className="absolute inset-x-0 top-1/2 w-[80%] max-w-4xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80"></div>
                <div className="absolute inset-x-0 top-1/2 w-[40%] max-w-xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-90 mix-blend-screen"></div>
                <div className="absolute w-[60%] max-w-3xl h-full bg-gradient-to-r from-cyan-600/20 to-orange-600/20 blur-[60px]"></div>
            </div>

            {/* --- CUSTOM MIDDLE SECTION --- */}
            {customMiddleSection}

            {/* --- STATS SECTION --- */}
            {stats && (
                <section className="py-16 border-b border-white/5 bg-[#030303] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-900/10 to-transparent blur-xl" />
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5 text-center">
                            {stats.map((stat, i) => (
                                <div key={i} className="px-4">
                                    <div className="text-4xl md:text-5xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-2 tracking-tighter">
                                        {stat.value}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wider mb-1">
                                        {stat.label}
                                    </div>
                                    {stat.subtext && <div className="text-[10px] text-gray-600 font-light">{stat.subtext}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* --- SECTION DIVIDER --- */}
            <div className="relative w-full flex justify-center items-center" style={{ height: '120px', marginTop: '-60px', marginBottom: '-60px', zIndex: 20, pointerEvents: 'none' }}>
                <div className="absolute inset-x-0 top-1/2 w-[80%] max-w-4xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80"></div>
                <div className="absolute inset-x-0 top-1/2 w-[40%] max-w-xl mx-auto h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-90 mix-blend-screen"></div>
                <div className="absolute w-[60%] max-w-3xl h-full bg-gradient-to-r from-cyan-600/20 to-orange-600/20 blur-[60px]"></div>
            </div>

            {/* --- FEATURES GRID --- */}
            <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#030303] relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_10%,transparent_100%)] pointer-events-none" />
                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-20 fade-up">
                        <h2 className="text-3xl md:text-5xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 mb-6 tracking-tighter">
                            Designed for <span className="text-white">Performance</span>
                        </h2>
                        <p className="text-gray-400 text-lg font-light">Every detail engineered to help you execute faster.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <div key={idx} className="group relative p-10 h-full rounded-[2rem] bg-[#050505] border border-white/5 hover:border-teal-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(20,184,166,0.1)]">
                                    <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />

                                    <div className="relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] flex items-center justify-center text-teal-400 mb-8 border border-white/5 group-hover:bg-teal-500/10 group-hover:border-teal-500/30 transition-colors shadow-lg">
                                            <Icon size={28} className="drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                                        </div>

                                        <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-teal-100 transition-colors tracking-tight">
                                            {feature.title}
                                        </h3>

                                        <p className="text-gray-400 leading-relaxed font-light mb-8 group-hover:text-gray-300">
                                            {feature.description}
                                        </p>

                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium group-hover:text-teal-400 transition-colors cursor-pointer">
                                            Explore Feature <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- SECTION DIVIDER --- */}
            <div className="relative w-full flex justify-center items-center overflow-visible z-20" style={{ height: '1px', marginTop: '-1px' }}>
                <div className="absolute w-[80%] max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80"></div>
                <div className="absolute w-[40%] max-w-xl h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-90 mix-blend-screen"></div>
                <div className="absolute w-[60%] max-w-3xl h-[120px] -translate-y-1/2 bg-gradient-to-r from-cyan-600/20 to-orange-600/20 blur-[60px] pointer-events-none"></div>
            </div>

            {/* --- DEEP DIVE (Optional) --- */}
            {deepDive && (
                <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#030303] relative overflow-hidden border-b border-white/5">
                    <div className="container mx-auto max-w-7xl relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            {/* Visual */}
                            <div className="flex-1 w-full lg:order-2 group">
                                <div className={`relative rounded-3xl border border-white/10 bg-[#050505] flex items-center justify-center shadow-2xl overflow-hidden ${deepDive.image ? 'aspect-auto' : 'aspect-square p-8'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 via-cyan-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                                    {swapVisuals && heroVisual ? (
                                        <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                                            {heroVisual}
                                        </div>
                                    ) : deepDive.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={deepDive.image} alt={deepDive.title} className="relative z-10 w-full h-auto object-cover" />
                                    ) : (
                                        <div className="text-center relative z-10">
                                            <div className="w-24 h-24 rounded-full bg-[#0A0A0A] border border-white/5 mx-auto mb-4 animate-pulse flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.2)]">
                                                <Zap size={32} className="text-teal-500/50" />
                                            </div>
                                            <div className="h-4 w-32 bg-white/5 rounded mx-auto border border-white/5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex-1 max-w-xl lg:order-1">
                                <h2 className="text-4xl md:text-5xl font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-6 leading-[1.1] tracking-tighter pb-2">
                                    {deepDive.title}
                                </h2>
                                <p className="text-gray-400 text-lg font-light leading-relaxed mb-10">
                                    {deepDive.description}
                                </p>
                                <ul className="space-y-6">
                                    {deepDive.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                                <CheckCircle2 size={12} className="text-teal-400" />
                                            </div>
                                            <span className="text-gray-300 font-light leading-relaxed">{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <CTASection />
            <Footer />
        </div>
    );
};
