"use client";

import React, { useRef, useEffect, useState } from "react";
import { Star, Quote, ArrowRight, Building2, ChevronLeft, ChevronRight, Heart, Network, Layout, Database } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

const TestimonialCard = ({ company, logo, headline, quote, author, role, index = 0 }: any) => (
    <div className="flex flex-col h-full p-8 rounded-2xl bg-[#09090b] border border-white/5 relative group hover:border-indigo-500/30 transition-all duration-500 overflow-hidden shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        {/* Company Logo */}
        <div className="mb-8 flex items-center text-gray-300 font-bold text-2xl tracking-tight relative z-10">
            {logo ? (
                <img src={logo} alt={company} className="w-9 h-9 rounded-[8px] mr-3 object-contain" />
            ) : (
                <Building2 className="mr-3 text-indigo-400" size={28} />
            )}
            {company}
        </div>

        {/* Headline */}
        <h4 className="text-xl md:text-2xl text-gray-300 font-light leading-snug mb-8 relative z-10" dangerouslySetInnerHTML={{ __html: headline }}>
        </h4>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-8 relative z-10"></div>

        {/* Quote */}
        <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-10 relative z-10 flex-grow">
            "{quote}"
        </p>

        {/* Author & Button */}
        <div className="mt-auto relative z-10">
            <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-full border-[1.5px] border-indigo-500/30 bg-[#09090b] overflow-hidden flex-shrink-0">
                    <img src={`https://i.pravatar.cc/100?img=${11 + (index % 50)}`} alt={author} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                    <div className="text-base font-semibold text-white">{author}</div>
                    <div className="text-sm text-gray-500">{role}</div>
                </div>
            </div>

            <button className="w-full px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md text-white text-sm font-medium transition-all shadow-[0_4px_24px_-8px_rgba(255,255,255,0.1)] group-hover:shadow-[0_4px_24px_-8px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer">
                Read Case Study
            </button>
        </div>
    </div>
);

export const TestimonialsSection = () => {
    const testimonials = [
        {
            company: "Doc2Product",
            logo: "./images/Doc2Product-logo.png",
            headline: "How Doc2Product achieved <span class='text-white font-bold'>95% Faster Deployments</span> with autonomous swarms",
            quote: "By delegating our CI/CD pipelines to an Agentflox swarm, we reduced deployment cycles from 3 days to 45 minutes. The agents catch edge cases our QA team used to miss.",
            author: "Elena Rodriguez",
            role: "VP of Engineering"
        },
        {
            company: "Kortex Labs",
            logo: "./images/bcce9fbd7d4147525a0901812b08274d.png",
            headline: "How Kortex Labs scaled to <span class='text-white font-bold'>10x Project Throughput</span> via the Kanban canvas",
            quote: "Agentflox isn't just a tool; it's our entire project management layer. The AI agents pull tasks directly from our Kanban board and execute them flawlessly.",
            author: "David Chen",
            role: "Lead Architect"
        },
        {
            company: "Omniflowai",
            logo: "./images/omniflowai.png",
            headline: "How Omniflowai maintained a <span class='text-white font-bold'>100% Audit Pass Rate</span> with strict guardrails",
            quote: "The built-in security guardrails and zero-retention policies are impeccable. We finally have an autonomous workflow that easily passes our banking compliance audits.",
            author: "Sarah Johnson",
            role: "CISO"
        },
        {
            company: "ApexCore",
            logo: "./images/Apexcoretech.png",
            headline: "How ApexCore reduced <span class='text-white font-bold'>30% Overhead</span> by visually mapping agent swarms",
            quote: "The ability to visually map out our agent swarms on the Project Canvas has completely transformed how our team understands and delegates complex workflows.",
            author: "Marcus West",
            role: "Director of Operations"
        },
        {
            company: "NexusFlow",
            logo: "./images/nebulasystem.png",
            headline: "How NexusFlow built a <span class='text-white font-bold'>Seamless AI Integration</span> into legacy enterprise systems",
            quote: "Thanks to the built-in MCP API tools and deep enterprise integrations, our AI workforce can securely connect to and query our legacy databases in real-time.",
            author: "Emily Tark",
            role: "Product Manager"
        }
    ];

    const [currentIndex, setCurrentIndex] = useState(0);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    };

    return (
        <section className="relative w-full py-20 bg-[#030303] overflow-hidden border-b border-white/5">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="container mx-auto px-4 sm:px-10 lg:px-20 relative z-10">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                            <Heart size={14} className="text-pink-400 fill-pink-400/20" />
                            <span className="text-xs font-medium text-white-300 tracking-wide uppercase">See The Results</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-[42px] leading-[1.25] tracking-tight font-medium">
                            <span className="text-white font-bold">Our customers love</span>{" "}
                            <motion.span
                                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                                style={{ backgroundSize: "200% auto" }}
                                className="bg-clip-text text-transparent bg-[linear-gradient(to_right,#0ea5e9,#22d3ee,#f59e0b,#22d3ee,#0ea5e9)] font-bold drop-shadow-sm"
                            >
                                AgentFlox
                            </motion.span>
                        </h2>
                    </div>
                    <div>
                        <motion.button
                            onMouseMove={handleMouseMove}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative px-6 py-3 rounded-full bg-[#0A0A0A] border border-white/10 overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.25)]"
                        >
                            {/* Dynamic Cursor-Tracking Glow Effect */}
                            <motion.div
                                className="absolute inset-0 z-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                                style={{
                                    background: useMotionTemplate`radial-gradient(110px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.25), transparent 50%)`
                                }}
                            />

                            {/* Content Container */}
                            <span className="relative z-10 flex items-center gap-2 font-medium text-sm text-gray-300 transition-colors duration-300">
                                {/* Gradient Text on Hover */}
                                <span className="group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-400 transition-all duration-500">
                                    View all case studies
                                </span>
                                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-all duration-300 text-gray-500 group-hover:text-cyan-400" />
                            </span>
                        </motion.button>
                    </div>
                </div>

                {/* Featured Big Quote */}
                <div className="mb-24 w-full bg-[#030303] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative z-10 border border-white/10 group">
                    {/* Grid Pattern Background */}
                    <div
                        className="absolute inset-0 z-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-700"
                        style={{
                            backgroundImage: `
                                linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
                            `,
                            backgroundSize: '2rem 2rem',
                            WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black, transparent)',
                            maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black, transparent)'
                        }}
                    />

                    {/* Left: Illustrations */}
                    <div className="w-full md:w-[35%] bg-white/5 flex items-end justify-center border-b md:border-b-0 md:border-r border-white/10 relative min-h-[300px] md:min-h-full backdrop-blur-sm z-10">
                        <div className="absolute inset-0 flex items-end justify-center overflow-hidden opacity-70 mix-blend-luminosity">
                            <img src="./images/dat-nguyen.png" alt="Dat Nguyen" className="w-full h-full object-contain object-bottom grayscale brightness-110 contrast-110 origin-bottom" />
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="w-full md:w-[65%] p-10 md:py-8 md:px-16 flex flex-col relative z-10">
                        {/* Company */}
                        <div className="flex items-center gap-4 mb-10 text-white font-bold text-3xl tracking-tight">
                            <img src="./images/telamonix.png" alt="Telamonix" className="w-10 h-10 object-contain rounded-[6px]" />
                            Telamonix
                        </div>

                        {/* Quote */}
                        <h3 className="text-2xl md:text-3xl lg:text-[32px] font-serif text-gray-200 leading-snug mb-10">
                            "Agentflox is an engineering team's dream workspace. It's the perfect platform to orchestrate our AI workforce, gather crucial execution context and produce critical pipeline insights."
                        </h3>

                        {/* Author */}
                        <div className="text-base text-gray-400 mb-12">
                            <strong className="text-white">Dat Nguyen</strong>, Director of Engineering
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-6 border-t border-white/10">
                            <span className="text-sm font-medium text-gray-500">Telamonix's favorite features</span>
                            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-300">
                                <span className="flex items-center gap-2"><Network size={16} className="text-gray-500" /> Swarms</span>
                                <span className="flex items-center gap-2"><Layout size={16} className="text-gray-500" /> Kanban</span>
                                <span className="flex items-center gap-2"><Database size={16} className="text-gray-500" /> Memory</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Carousel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden mb-12">
                    {testimonials.slice(currentIndex, currentIndex + 3).map((t, i) => (
                        <div key={i + currentIndex} className="h-full animate-in fade-in slide-in-from-right-8 duration-500">
                            <TestimonialCard {...t} index={i + currentIndex} />
                        </div>
                    ))}
                </div>

                {/* Carousel Controls (Bottom Right) */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        className="w-14 h-14 rounded-full bg-gray-100 hover:bg-white flex items-center justify-center text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => setCurrentIndex(prev => Math.min(testimonials.length - 3, prev + 1))}
                        className="w-14 h-14 rounded-full bg-gray-100 hover:bg-white flex items-center justify-center text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        disabled={currentIndex >= testimonials.length - 3}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </section>
    );
};
