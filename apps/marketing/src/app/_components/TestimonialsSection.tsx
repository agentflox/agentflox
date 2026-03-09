"use client";

import React, { useRef, useEffect } from "react";
import { Star, Quote, ArrowRight, Building2 } from "lucide-react";

const TestimonialCard = ({ logo, quote, author, role, company, metric }: any) => (
    <div className="flex flex-col h-full justify-between p-8 rounded-3xl bg-[#0A0A0A] border border-white/5 relative group hover:border-indigo-500/20 transition-all duration-500">
        <div className="absolute top-8 right-8 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
            <Quote size={64} />
        </div>

        <div>
            {/* Logo Placeholder - In real app use SVG logos */}
            <div className="h-8 mb-8 flex items-center text-gray-500 font-bold text-lg tracking-tight group-hover:text-white transition-colors">
                <Building2 className="mr-2" size={20} />
                {company}
            </div>

            <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed mb-8 relative z-10">
                "{quote}"
            </p>
        </div>

        <div>
            {metric && (
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-6">
                    {metric}
                </div>
            )}

            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                    {author.charAt(0)}
                </div>
                <div>
                    <div className="text-sm font-semibold text-white">{author}</div>
                    <div className="text-xs text-gray-500">{role}</div>
                </div>
            </div>
        </div>
    </div>
);

export const TestimonialsSection = () => {
    const testimonials = [
        {
            company: "Acme Corp",
            quote: "We reduced our deployment cycle from 3 days to 45 minutes. The autonomous agents catch edge cases our QA team used to miss.",
            author: "Elena Rodriguez",
            role: "CTO",
            metric: "95% Faster Deployments"
        },
        {
            company: "Nebula Systems",
            quote: "Agentflox isn't just a tool; it's a force multiplier. We scaled from 5 to 50 active projects without hiring a single new manager.",
            author: "David Chen",
            role: "VP of Engineering",
            metric: "10x Project Throughput"
        },
        {
            company: "QuantumSoft",
            quote: "The security guardrails are impeccable. We finally have an AI workflow that passes our banking compliance audits.",
            author: "Sarah Johnson",
            role: "CISO",
            metric: "100% Audit Pass Rate"
        }
    ];

    return (
        <section className="relative w-full py-32 bg-[#030303] overflow-hidden border-b border-white/5">
            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-20">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm">
                            <Star size={12} />
                            Trusted by Industry Leaders
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                            Powering the Next Generation <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                of Tech Companies.
                            </span>
                        </h2>
                    </div>
                    <div className="hidden md:flex">
                        <button className="px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2">
                            Read Case Studies
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <TestimonialCard key={i} {...t} />
                    ))}
                </div>

                {/* Social Proof Bar */}
                <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center">
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-8">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Mock Logos using text for now, in prod replace with SVGs */}
                        {['Google', 'Microsoft', 'Spotify', 'Airbnb', 'Stripe'].map(brand => (
                            <span key={brand} className="text-xl font-bold text-white font-sans">{brand}</span>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};
