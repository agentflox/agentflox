"use client";
import React from 'react';
import { ArrowRight, Building2, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { Navigation, Footer, CTASection } from '../_components';
import { AnimatedBackground } from '@/components/layout/AnimatedBackground';

const CaseStudyCard = ({ company, title, description, metrics, icon: Icon, colorClass, delay }: any) => (
    <div 
        className="group relative bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-all duration-500 flex flex-col h-full animate-fade-in"
        style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
        {/* Card Header Pattern */}
        <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${colorClass} opacity-20 group-hover:opacity-30 transition-opacity`}>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay opacity-50" />
        </div>
        
        <div className="p-8 flex-1 flex flex-col relative z-10 -mt-12">
            <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mb-6 shadow-xl text-white">
                <Icon size={24} />
            </div>
            
            <div className="flex items-center gap-2 mb-4 text-gray-400 font-mono text-xs uppercase tracking-widest">
                <Building2 size={14} />
                {company}
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-indigo-300 transition-colors">
                {title}
            </h3>
            
            <p className="text-gray-400 font-light leading-relaxed mb-8 flex-1">
                {description}
            </p>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {metrics.map((metric: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                        <div className="text-xs text-gray-500 uppercase">{metric.label}</div>
                    </div>
                ))}
            </div>
            
            <Link href={`/case-studies/${company.toLowerCase().replace(' ', '-')}`} className="inline-flex items-center gap-2 text-white font-medium hover:text-indigo-400 transition-colors">
                Read full study <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
            colorClass: "from-indigo-500 to-blue-600",
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
            colorClass: "from-purple-500 to-pink-600",
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
        <div className="relative min-h-screen bg-[#030303] text-white overflow-hidden">
            <AnimatedBackground />
            <Navigation />
            
            <main className="pt-32 pb-24 relative z-10">
                {/* Header */}
                <div className="container mx-auto px-6 lg:px-12 text-center mb-24 max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm animate-fade-in">
                        Customer Success
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                        How the best teams <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            build with AI.
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                        Explore how forward-thinking companies are using Agentflox to automate workflows, manage complex projects, and deploy autonomous intelligence at scale.
                    </p>
                </div>

                {/* Grid */}
                <div className="container mx-auto px-6 lg:px-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
