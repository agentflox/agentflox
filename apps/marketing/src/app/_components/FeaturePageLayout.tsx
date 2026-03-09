"use client";

import React, { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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
    deepDive?: {
        title: string;
        description: string;
        image?: string; // URL or component
        bullets: string[];
    };
}

export const FeaturePageLayout = ({ badge, title, description, heroVisual, features, stats, deepDive }: FeaturePageProps) => {
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);

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
        <div className="relative min-h-screen text-white overflow-x-hidden bg-[#020202]">
            <AnimatedBackground />
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-white/5">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

                <div className="container mx-auto max-w-7xl relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                        {/* Text Content */}
                        <div className="flex-1 max-w-2xl relative">
                            <div className="fade-up inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-8 backdrop-blur-md shadow-lg shadow-indigo-500/10">
                                <Zap size={12} className="fill-indigo-500/20" />
                                {badge}
                            </div>

                            <h1 className="fade-up text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-[1.05] tracking-tight">
                                {title}
                            </h1>

                            <p className="fade-up text-xl text-gray-400 font-light leading-relaxed mb-10 max-w-xl text-balance">
                                {description}
                            </p>

                            <div className="fade-up flex flex-wrap gap-4">
                                <Link
                                    href="/signup"
                                    className="group px-8 py-4 bg-white text-black font-bold text-sm rounded-full hover:bg-indigo-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1 flex items-center gap-2"
                                >
                                    Start Free Trial
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button className="group px-8 py-4 bg-white/5 text-white font-medium text-sm rounded-full border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-sm">
                                    <Play size={16} className="fill-white" />
                                    Watch Demo
                                </button>
                            </div>

                            {/* Trust / Stats Mini */}
                            <div className="fade-up mt-12 flex items-center gap-6 text-sm text-gray-500 font-medium">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-indigo-500/20 border border-[#020202] flex items-center justify-center text-xs text-white ring-2 ring-[#020202]">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                </div>
                                <span>Used by 10,000+ innovators</span>
                            </div>
                        </div>

                        {/* Hero Visual - Dynamic & Parallax */}
                        <motion.div style={{ y: y1 }} className="flex-1 w-full relative perspective-[2000px] group">
                            {/* Glow behind */}
                            <div className="absolute inset-0 bg-indigo-600/20 blur-[80px] rounded-3xl -z-10 group-hover:bg-indigo-600/30 transition-colors duration-700" />

                            {/* Main Visual Card */}
                            <div className="relative rounded-2xl border border-white/10 bg-[#080808]/90 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center transform transition-transform duration-700 hover:rotate-x-2 hover:rotate-y-2">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                {heroVisual || (
                                    <div className="flex flex-col items-center gap-4 text-gray-700">
                                        <Layout size={64} strokeWidth={1} />
                                        <span className="font-mono text-sm uppercase tracking-widest">[Product Interface]</span>
                                    </div>
                                )}

                                {/* UI Chrome Decor */}
                                <div className="absolute top-4 left-4 right-4 h-8 bg-white/5 rounded-lg flex items-center px-3 border border-white/5">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>


            {/* --- STATS SECTION --- */}
            {stats && (
                <section className="py-12 border-b border-white/5 bg-[#050505]">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5 text-center">
                            {stats.map((stat, i) => (
                                <div key={i} className="px-4">
                                    <div className="text-3xl md:text-4xl font-bold text-white mb-1 font-mono tracking-tighter">
                                        {stat.value}
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">
                                        {stat.label}
                                    </div>
                                    {stat.subtext && <div className="text-[10px] text-gray-600 font-light">{stat.subtext}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}


            {/* --- FEATURES GRID --- */}
            <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#030303]">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center max-w-3xl mx-auto mb-20 fade-up">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Designed for Performance</h2>
                        <p className="text-gray-400 text-lg">Every detail engineered to help you execute faster.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => {
                            const Icon = feature.icon;
                            return (
                                <div key={idx} className="group relative p-8 h-full rounded-3xl bg-[#080808] border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-2">
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="relative z-10">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 mb-8 border border-white/10 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 transition-colors shadow-lg">
                                            <Icon size={28} />
                                        </div>

                                        <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-indigo-100 transition-colors">
                                            {feature.title}
                                        </h3>

                                        <p className="text-gray-400 leading-relaxed font-light mb-8 group-hover:text-gray-300">
                                            {feature.description}
                                        </p>

                                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium group-hover:text-indigo-400 transition-colors cursor-pointer">
                                            Explore Feature <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>


            {/* --- DEEP DIVE (Optional) --- */}
            {deepDive && (
                <section className="py-32 px-4 border-y border-white/5 bg-[#050505] overflow-hidden">
                    <div className="container mx-auto max-w-7xl">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            {/* Visual */}
                            <div className="flex-1 w-full lg:order-2">
                                <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0A] aspect-square flex items-center justify-center p-8 shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent" />
                                    {/* Placeholder for Deep Dive Image */}
                                    <div className="text-center">
                                        <div className="w-24 h-24 rounded-full bg-white/5 mx-auto mb-4 animate-pulse" />
                                        <div className="h-4 w-32 bg-white/10 rounded mx-auto" />
                                    </div>
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex-1 max-w-xl lg:order-1">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                                    {deepDive.title}
                                </h2>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    {deepDive.description}
                                </p>
                                <ul className="space-y-4">
                                    {deepDive.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle2 size={20} className="text-indigo-500 shrink-0 mt-1" />
                                            <span className="text-gray-300">{bullet}</span>
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
