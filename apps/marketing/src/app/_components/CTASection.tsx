"use client";
import React, { useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, Bot, Workflow, Users, Zap, CheckCircle2, Rocket } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const CTASection = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const blobRef = useRef<HTMLDivElement>(null);

    const floatingIcons = [
        { icon: Bot },
        { icon: Workflow },
        { icon: Users },
        { icon: Zap }
    ];

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Animate floating icons
            const icons = containerRef.current?.querySelectorAll('.floating-icon');
            if (icons) {
                Array.from(icons).forEach((icon, index) => {
                    gsap.to(icon, {
                        y: `+=${30 + index * 10}`,
                        rotation: `+=${5 + index * 2}`,
                        duration: 3 + index,
                        repeat: -1,
                        yoyo: true,
                        ease: 'sine.inOut',
                        delay: index * 0.3
                    });
                });
            }

            // Mouse move blob effect
            const handleMouseMove = (e: MouseEvent) => {
                if (blobRef.current && containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    gsap.to(blobRef.current, {
                        x: x,
                        y: y,
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                }
            };

            const currentContainer = containerRef.current;
            if (currentContainer) {
                currentContainer.addEventListener('mousemove', handleMouseMove);
            }

            return () => {
                if (currentContainer) {
                    currentContainer.removeEventListener('mousemove', handleMouseMove);
                }
            };
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="relative py-24 overflow-hidden bg-[#030303]">

            {/* Background Elements */}
            <div className="absolute inset-0 bg-[#030303]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />

            <div ref={containerRef} className="relative max-w-7xl mx-auto px-6">
                <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/15 to-transparent">
                    <div className="relative rounded-[23px] overflow-hidden bg-[#050505]">
                        {/* Animated Background Blob */}
                        <div ref={blobRef} className="absolute -top-[400px] -left-[400px] w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none transition-transform duration-300 ease-out z-0" />
                        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none z-0" />

                        <div className="relative z-10 flex flex-col items-center justify-center text-center py-16 px-4 min-h-[500px]">
                            {/* Ambient glow in center */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none z-0" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full bg-purple-500/10 blur-[50px] pointer-events-none z-0" />

                            <div className="relative z-20 max-w-xl flex flex-col items-center">
                                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
                                    Start building your <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300">
                                        Venture Empire
                                    </span>
                                </h2>

                                <p className="text-lg text-gray-400 mb-8 max-w-lg font-light leading-relaxed">
                                    Join thousands of founders, investors, and builders using Agentflox to orchestrate their vision.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
                                    <Link
                                        href={ROUTES.SIGNUP}
                                        className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-semibold overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] active:scale-[0.98]"
                                    >
                                        {/* Shimmer Effect */}
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                                        <span className="relative z-10 flex items-center gap-2">
                                            Get Started Now
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Link>
                                    <button className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.15)] active:scale-[0.98] backdrop-blur-md cursor-pointer">
                                        {/* Shimmer Effect */}
                                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                                        <span className="relative z-10">Contact Sales</span>
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <CheckCircle2 size={16} className="text-indigo-400" />
                                        <span>No credit card required</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <CheckCircle2 size={16} className="text-indigo-400" />
                                        <span>Enterprise-grade security</span>
                                    </div>
                                </div>
                            </div>

                            {/* Left Man AI Face - Flipped to put code on right half */}
                            <img
                                src="/images/cta_ai_man_face-removebg-preview.png"
                                alt="AI Intelligence Man"
                                className="z-[5] h-[110%] w-auto max-w-none object-contain select-none absolute bottom-0 left-0 -translate-x-1/2 -scale-x-100 opacity-90 pointer-events-none hidden md:block"
                                style={{ clipPath: 'inset(0 50% 0 0)' }}
                            />

                            {/* Right Woman AI Face - Code on left half */}
                            <img
                                src="/images/cta_ai_face-removebg-preview.png"
                                alt="AI Intelligence Woman"
                                className="z-[5] h-[110%] w-auto max-w-none object-contain select-none absolute bottom-0 right-0 translate-x-1/2 opacity-90 pointer-events-none hidden md:block"
                                style={{ clipPath: 'inset(0 50% 0 0)' }}
                            />

                            {/* Fade at bottom to blend smoothly */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
