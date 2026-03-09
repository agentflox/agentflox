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
            // Animate Container on scroll
            if (containerRef.current) {
                gsap.fromTo(containerRef.current,
                    { opacity: 0, y: 40, scale: 0.95 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 1,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 75%',
                            toggleActions: 'play none none reverse'
                        }
                    }
                );
            }

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
                <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-[#050505]">
                    {/* Animated Background Blob */}
                    <div ref={blobRef} className="absolute -top-[400px] -left-[400px] w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none transition-transform duration-300 ease-out z-0" />
                    <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none z-0" />

                    <div className="relative z-10 grid lg:grid-cols-2 gap-12 p-8 md:p-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium uppercase tracking-wider text-gray-400 mb-6">
                                <Sparkles size={14} className="text-indigo-400" />
                                Ready to Launch?
                            </div>

                            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
                                Start building your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300">
                                    Venture Empire
                                </span>
                            </h2>

                            <p className="text-lg text-gray-500 mb-8 max-w-lg font-light leading-relaxed">
                                Join thousands of founders, investors, and builders using Agentflox to orchestrate their vision.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                                <Link
                                    href={ROUTES.SIGNUP}
                                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-sm font-medium hover:bg-gray-200 transition-all text-base"
                                >
                                    Get Started Now
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-white/20 rounded-sm font-medium text-white hover:bg-white/5 transition-all text-base">
                                    Contact Sales
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <CheckCircle2 size={16} className="text-indigo-400" />
                                    <span>No credit card required for 14-day trial</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <CheckCircle2 size={16} className="text-indigo-400" />
                                    <span>Enterprise-grade security & compliance</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative h-[400px] bg-[#0A0A0A] rounded-2xl border border-white/5 p-8 flex items-center justify-center group overflow-hidden">
                            {/* Decorative grid inside the card */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px]" />

                            {/* Floating Elements Animation */}
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Central Node */}
                                <div className="absolute z-20 w-24 h-24 bg-[#0F0F0F] rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl shadow-indigo-500/10">
                                    <Rocket size={40} className="text-white" />
                                </div>

                                {/* Orbiting Satellites */}
                                {floatingIcons.map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={i}
                                            className="floating-icon absolute bg-[#0F0F0F] p-3 rounded-xl border border-white/10 shadow-lg"
                                            style={{
                                                top: `${(50 + (Math.sin(i * 2) * 35)).toFixed(4)}%`,
                                                left: `${(50 + (Math.cos(i * 2) * 35)).toFixed(4)}%`,
                                            }}
                                        >
                                            <Icon size={20} className="text-gray-400" />
                                        </div>
                                    )
                                })}

                                {/* Connection Lines (SVG) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <circle cx="50%" cy="50%" r="35%" fill="none" stroke="#222" strokeWidth="1" strokeDasharray="4 4" className="animate-spin-slow opacity-30" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
