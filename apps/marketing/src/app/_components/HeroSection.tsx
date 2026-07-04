"use client";
import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ROUTES } from '../../lib/config';

/* ─────────────────────────────────────────────
   HeroSection
───────────────────────────────────────────── */
export const HeroSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const demoRef = useRef<HTMLDivElement>(null);

    return (
        <section
            ref={containerRef}
            className="relative min-h-[95vh] w-full flex flex-col justify-center overflow-hidden bg-[#030303] text-white pt-32 pb-16"
        >
            <div className="container relative z-10 mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* Left: copy */}
                    <div className="max-w-2xl">
                        <h1 className="hero-text-block text-4xl sm:text-5xl md:text-6xl font-medium tracking-tighter leading-[1.05] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70">
                            Run your work.<br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold">Delegate to your AI.</span><br />
                            One system.
                        </h1>

                        <p className="hero-text-block text-lg md:text-xl text-gray-400 leading-relaxed mb-10 font-light">
                            Agentflox brings your teams, projects, and autonomous agents into one workspace.
                            Describe what you need done, and your AI workforce builds, executes, and reports back.
                        </p>

                        <div className="hero-text-block flex flex-wrap gap-5 mt-4">
                            {/* Primary Button */}
                            <Link href={ROUTES.SIGNUP} className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02]">
                                <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover:bg-opacity-0 transition-all duration-500 z-0"></div>
                                <div className="absolute inset-0 overflow-hidden rounded-xl z-10">
                                    <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out">
                                        <div className="h-full w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-[20deg]" />
                                    </div>
                                </div>
                                <span className="relative z-20 flex items-center gap-3 text-lg font-semibold text-white transition-all duration-300">
                                    Start Building Free
                                    <ArrowRight size={20} className="text-orange-300 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300" />
                                </span>
                                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-70 transition-all duration-500 z-[-1]"></div>
                            </Link>

                            {/* Secondary Button */}
                            <Link href="/book-demo" className="group relative inline-flex items-center justify-center px-8 py-4 font-medium text-white transition-all duration-500 rounded-xl hover:scale-[1.02] overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <div className="absolute inset-0 overflow-hidden rounded-xl z-10 pointer-events-none">
                                    <div className="absolute top-0 left-0 h-full w-[200%] -translate-x-[150%] group-hover:translate-x-[50%] transition-transform duration-1000 ease-out delay-100">
                                        <div className="h-full w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-[20deg]" />
                                    </div>
                                </div>
                                <span className="relative z-20 flex items-center gap-2 text-lg">
                                    Book a Demo
                                </span>
                            </Link>
                        </div>
                    </div>

                    {/* Right: premium hero image */}
                    <div
                        ref={demoRef}
                        className="hero-demo-box relative w-full aspect-square md:aspect-[16/10] rounded-3xl overflow-visible group"
                        style={{ minHeight: 380, transform: 'translateY(2rem)' }}
                    >
                        {/* Wrapper scaled up slightly to make the image wider/larger */}
                        <div className="absolute inset-0 scale-[1.15] md:scale-[1.25]">
                            <Image
                                src="/images/ai-workforce.png"
                                alt="Agentflox AI Workflow Nodes"
                                fill
                                className="object-contain transition-transform duration-1000 group-hover:scale-105"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};