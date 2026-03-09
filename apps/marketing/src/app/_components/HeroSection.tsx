"use client";
import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Plus, ArrowUpRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const HeroSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const orbitRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            // Entrance
            tl.from(".hero-line-1", { y: 100, opacity: 0, duration: 1.2, rotateX: -20 })
                .from(".hero-line-2", { y: 100, opacity: 0, duration: 1.2, rotateX: -20 }, "-=1.0")
                .from(".hero-sub", { y: 30, opacity: 0, duration: 1 }, "-=0.8")
                .from(".hero-cta", { y: 20, opacity: 0, duration: 0.8 }, "-=0.6")
                .from(".orbit-system", { scale: 0.8, opacity: 0, duration: 1.5, ease: "expo.out" }, "-=1.5");

            // Orbit Animation
            if (orbitRef.current) {
                gsap.to(".orbit-ring", {
                    rotation: 360,
                    duration: 20,
                    repeat: -1,
                    ease: "none",
                    stagger: {
                        each: 5,
                        from: "end"
                    }
                });
            }
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="relative min-h-[90vh] w-full flex flex-col justify-center overflow-hidden bg-[#030303] text-white pt-20"
        >
            {/* --- ATMOSPHERIC BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full opacity-40 mix-blend-screen animate-pulse duration-[5000ms]" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-900/10 blur-[100px] rounded-full opacity-30" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

                {/* Horizontal Horizon Line */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent opacity-50" />
            </div>

            <div className="container relative z-10 mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">

                {/* --- TYPOGRAPHY CONTENT --- */}
                <div className="max-w-4xl">
                    <div className="flex items-center gap-3 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                        <div className="px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md text-xs font-medium text-indigo-300 tracking-wider uppercase flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Venture Operating System v1.0
                        </div>
                    </div>

                    <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
                        <span className="hero-line-1 block text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500">
                            Where Ambition
                        </span>
                        <span className="hero-line-2 block text-white/90">
                            Meets <i className="font-serif font-light italic text-indigo-300">Execution.</i>
                        </span>
                    </h1>

                    <p className="hero-sub text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed mb-10 font-light">
                        Agentflox is the first unified ecosystem designed to synthesize capital, talent, and autonomous intelligence. Transform abstract ideas into enduring realities.
                    </p>

                    <div className="hero-cta flex flex-wrap gap-4">
                        <Link
                            href={ROUTES.SIGNUP}
                            className="group relative px-8 py-4 bg-white text-black text-lg font-medium rounded-sm overflow-hidden transition-all hover:bg-gray-100 flex items-center gap-2"
                        >
                            Start Building
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </Link>

                        <Link
                            href="#features"
                            className="group px-8 py-4 bg-transparent border border-white/20 text-white text-lg font-medium rounded-sm hover:bg-white/5 transition-all flex items-center gap-2"
                        >
                            Explore Platform
                            <ArrowUpRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                        </Link>
                    </div>
                </div>

                {/* --- ORBITAL VISUALIZATION --- */}
                <div className="relative hidden lg:flex items-center justify-center orbit-system">
                    {/* Core */}
                    <div className="relative z-20 w-32 h-32 bg-black rounded-full border border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.3)] flex items-center justify-center">
                        <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-pulse" />
                        <span className="text-4xl font-bold tracking-tighter text-white">A</span>
                    </div>

                    {/* Orbit Ring 1 (Capital) */}
                    <div className="orbit-ring absolute w-[280px] h-[280px] border border-white/5 rounded-full border-dashed" style={{ animation: 'spin 20s linear infinite' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-lg transform rotate-[-0deg]">
                            <span className="text-xs text-gray-400">$</span>
                        </div>
                    </div>

                    {/* Orbit Ring 2 (Talent) */}
                    <div className="orbit-ring absolute w-[420px] h-[420px] border border-white/5 rounded-full border-dotted opacity-70" style={{ animationDuration: '35s' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-lg">
                            <Plus size={12} className="text-gray-400" />
                        </div>
                    </div>

                    {/* Orbit Ring 3 (Agents) */}
                    <div className="orbit-ring absolute w-[560px] h-[560px] border border-indigo-500/20 rounded-full" style={{ animationDuration: '45s', animationDirection: 'reverse' }}>
                        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0A0A0A] border border-indigo-500/50 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            <Sparkles size={14} className="text-indigo-400" />
                        </div>
                    </div>

                    {/* Decorative Radial Lines */}
                    <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/80 pointer-events-none" />
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none" />
        </section>
    );
};
