"use client";
import React from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';

export const IntegrationsSection = () => {
    return (
        <section className="relative w-full py-24 bg-[#030303] text-white overflow-hidden">
            <div className="container relative z-10 mx-auto px-6 lg:px-12">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Meet your team where they already work.</h2>
                    <p className="text-xl text-gray-400 font-light">
                        Connect your favorite tools instantly. Slack, GitHub, Jira, Google Workspace. Your agents and automations act on real systems, not just inside Agentflox.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto aspect-video md:aspect-[21/9] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center justify-center p-8">
                    {/* Abstract Integration Nodes */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute w-24 h-24 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.5)] z-20">
                            <span className="font-bold text-2xl tracking-tighter">AF</span>
                        </div>

                        {/* Orbiting App Nodes - Fallback Grid on Mobile */}
                        <div className="hidden md:block">
                            <div className="absolute top-[20%] left-[20%] w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md animate-pulse">
                                {/* SVG for Slack / GitHub etc could go here, using simple abstract for now */}
                                <div className="w-8 h-8 rounded-full bg-blue-400/80" />
                            </div>
                            <div className="absolute bottom-[20%] left-[30%] w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md" style={{ animationDelay: '0.5s' }}>
                                <div className="w-6 h-6 rounded-sm bg-orange-400/80" />
                            </div>
                            <div className="absolute top-[30%] right-[25%] w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md" style={{ animationDelay: '1s' }}>
                                <div className="w-8 h-8 rounded-full bg-purple-400/80" />
                            </div>
                            <div className="absolute bottom-[25%] right-[20%] w-20 h-20 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md" style={{ animationDelay: '1.5s' }}>
                                <div className="w-10 h-10 rounded bg-green-400/80" />
                            </div>

                            {/* Connection Lines (Abstract SVG) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
                                <path d="M 25% 25% Q 50% 50% 50% 50%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                                <path d="M 35% 75% Q 50% 50% 50% 50%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                                <path d="M 75% 35% Q 50% 50% 50% 50%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                                <path d="M 80% 70% Q 50% 50% 50% 50%" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="4 4" />
                            </svg>
                        </div>

                        {/* Mobile Grid Fallback */}
                        <div className="grid grid-cols-2 gap-4 md:hidden w-full max-w-xs mt-32">
                            <div className="h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">App 1</div>
                            <div className="h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">App 2</div>
                            <div className="h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">App 3</div>
                            <div className="h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">App 4</div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link href="#integrations" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        View all 50+ integrations <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
};
