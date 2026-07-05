"use client";
import React from 'react';
import { ArrowRight, Building2, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { Navigation, Footer, CTASection } from '../_components';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

const CaseStudyCard = ({ company, title, description, metrics, icon: Icon, colorClass, delay }: any) => (
    <div 
        className="group relative bg-[#050505] border border-white/5 rounded-[2rem] overflow-hidden hover:border-teal-500/30 transition-all duration-500 flex flex-col h-full animate-fade-in hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(20,184,166,0.1)]"
        style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
        {/* Card Header Pattern */}
        <div className={`h-40 relative overflow-hidden bg-gradient-to-br ${colorClass} opacity-10 group-hover:opacity-20 transition-opacity duration-700`}>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay opacity-30" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>
        
        <div className="p-8 flex-1 flex flex-col relative z-10 -mt-16">
            <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center mb-8 shadow-xl text-white group-hover:border-teal-500/30 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-all duration-500">
                <Icon size={24} className="drop-shadow-[0_0_8px_currentColor]" />
            </div>
            
            <div className="flex items-center gap-2 mb-4 text-gray-500 font-mono text-xs uppercase tracking-widest font-semibold group-hover:text-teal-500 transition-colors">
                <Building2 size={14} />
                {company}
            </div>
            
            <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-teal-100 transition-colors tracking-tight leading-snug">
                {title}
            </h3>
            
            <p className="text-gray-400 font-light leading-relaxed mb-8 flex-1">
                {description}
            </p>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {metrics.map((metric: any, i: number) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 group-hover:bg-teal-500/[0.02] transition-colors duration-500">
                        <div className="text-2xl font-medium text-white mb-1 tracking-tighter">{metric.value}</div>
                        <div className="text-[11px] text-gray-500 uppercase tracking-widest">{metric.label}</div>
                    </div>
                ))}
            </div>
            
            <Link href={`/case-studies/${company.toLowerCase().replace(' ', '-')}`} className="inline-flex items-center gap-2 text-teal-400 font-medium hover:text-teal-300 transition-colors group/link text-sm">
                Read full study <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
            </Link>
        </div>
    </div>
);

export default function CaseStudiesPage() {
    const studies = [
        {
            company: "Acme Corp",
            title: "Shipping 3x faster with autonomous QA agents.",
            description: "How a leading e-commerce platform reduced their deployment cycle from 3 days to 45 minutes by implementing Agentflox's automated QA swarm.",
            icon: Zap,
            colorClass: "from-teal-500 to-cyan-600",
            metrics: [
                { value: "95%", label: "Faster Deploys" },
                { value: "0", label: "P0 Bugs Escaped" }
            ],
            delay: 0.1
        },
        {
            company: "Nebula Systems",
            title: "Scaling project capacity without scaling headcount.",
            description: "Nebula Systems utilized automated workflows and AI project managers to increase their active project load from 5 to 50, all with the same core team.",
            icon: TrendingUp,
            colorClass: "from-orange-500 to-amber-600",
            metrics: [
                { value: "10x", label: "Project Throughput" },
                { value: "$2M+", label: "Saved in Ops Costs" }
            ],
            delay: 0.2
        },
        {
            company: "QuantumSoft",
            title: "Ensuring 100% compliance in FinTech using Guardrail Agents.",
            description: "Discover how QuantumSoft built a specialized compliance workforce that audits every code commit and database query against strict banking regulations.",
            icon: ShieldCheck,
            colorClass: "from-emerald-500 to-teal-600",
            metrics: [
                { value: "100%", label: "Audit Pass Rate" },
                { value: "< 2s", label: "Review Latency" }
            ],
            delay: 0.3
        }
    ];

    return (
        <div className="relative min-h-screen bg-[#030303] text-white overflow-hidden selection:bg-teal-500/30">
            <AnimatedBackground />
            <Navigation />
            
            <main className="pt-40 pb-24 relative z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[500px] bg-teal-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

                {/* Header */}
                <div className="container mx-auto px-6 lg:px-12 text-center mb-24 max-w-4xl relative">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold uppercase tracking-widest text-teal-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.1)] animate-fade-in">
                        Customer Success
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter mb-8 animate-fade-in leading-[1.05]" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                        How the best teams <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 drop-shadow-2xl">
                            build with AI.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed animate-fade-in max-w-3xl mx-auto" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                        Explore how forward-thinking companies are using Agentflox to automate workflows, manage complex projects, and deploy autonomous intelligence at scale.
                    </p>
                </div>

                {/* Grid */}
                <div className="container mx-auto px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {studies.map((study, idx) => (
                            <CaseStudyCard key={idx} {...study} />
                        ))}
                    </div>
                </div>
            </main>

            <div className="relative z-10">
                <CTASection />
                <Footer />
            </div>
        </div>
    );
}

