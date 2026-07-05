"use client";
import React, { useState } from 'react';
import { Navigation } from '../_components/Navigation';
import { Footer } from '../_components/Footer';
import { Check, X, HelpCircle, ArrowRight, Zap, Shield, Bot, Building, Globe, CheckCircle2, Minus, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';


export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    const plans = [
        {
            name: 'Free',
            price: '$0',
            description: 'For hobbyists and individual developers exploring agentic workflows.',
            features: [
                '1 Autonomous Agent',
                '500 executions / month',
                'Basic Memory (Short-term)',
                'Community Support',
                'Public Marketplace Access'
            ],
            cta: 'Start Building',
            href: ROUTES.SIGNUP,
            variant: 'basic'
        },
        {
            name: 'Basic',
            price: billingCycle === 'yearly' ? '$29' : '$39',
            description: 'For early-stage founders and small teams automating core tasks.',
            features: [
                '5 Autonomous Agents',
                '5,000 executions / month',
                'Long-term Memory (Vector DB)',
                'Workflow Builder',
                'Email Support (48h SLA)',
                '3 Team Members'
            ],
            cta: 'Get Started',
            href: `${ROUTES.SIGNUP}?plan=basic`,
            variant: 'basic'
        },
        {
            name: 'Business',
            price: billingCycle === 'yearly' ? '$99' : '$129',
            description: 'For scaling companies requiring advanced orchestration and security.',
            features: [
                'Unlimited Agents',
                '50,000 executions / month',
                'Multi-Agent Collaboration',
                'SSO (Google & GitHub)',
                'Priority Support (12h SLA)',
                'Unlimited Team Members',
                'Advanced Analytics'
            ],
            cta: 'Start Free Trial',
            href: `${ROUTES.SIGNUP}?plan=business`,
            variant: 'popular',
            badge: 'Most Popular'
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            description: 'For large organizations needing dedicated infrastructure and compliance.',
            features: [
                'Dedicated GPU Clusters',
                'Unlimited Volume',
                'On-Premise / VPC Option',
                'SAML / OIDC SSO',
                'Dedicated Success Manager',
                'Custom SLA (99.99%)',
                'Audit Logs & Governance'
            ],
            cta: 'Contact Sales',
            href: '/contact',
            variant: 'enterprise'
        }
    ];

    const comparisons = [
        {
            category: 'Core Platform',
            features: [
                { name: 'Agent Count', free: '1', basic: '5', business: 'Unlimited', enterprise: 'Unlimited' },
                { name: 'Monthly Executions', free: '500', basic: '5k', business: '50k', enterprise: 'Unlimited' },
                { name: 'Concurrent Runs', free: '1', basic: '5', business: '20', enterprise: '500+' },
                { name: 'Memory Retention', free: '24 Hours', basic: '30 Days', business: '1 Year', enterprise: 'Unlimited' },
            ]
        },
        {
            category: 'Advanced Capabilities',
            features: [
                { name: 'Multi-Agent Swarms', free: false, basic: false, business: true, enterprise: true },
                { name: 'Custom Tool Integration', free: false, basic: true, business: true, enterprise: true },
                { name: 'Human-in-the-Loop', free: false, basic: true, business: true, enterprise: true },
                { name: 'Workflow Logic', free: 'Basic', basic: 'Advanced', business: 'Advanced', enterprise: 'Visual Editor' },
            ]
        },
        {
            category: 'Security & Control',
            features: [
                { name: 'SSO', free: false, basic: false, business: 'Google/GitHub', enterprise: 'SAML/OIDC' },
                { name: 'Data Residency', free: 'US East', basic: 'US East', business: 'US/EU', enterprise: 'Global Choice' },
                { name: 'Audit Logs', free: false, basic: false, business: 'Basic', enterprise: 'Full Compliance' },
                { name: 'SLA Support', free: 'Community', basic: 'Email (48h)', business: 'Priority (12h)', enterprise: 'Dedicated (1h)' },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-teal-500/30 overflow-x-hidden">
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section className="relative pt-40 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[500px] bg-teal-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                    >
                        <Zap size={14} className="text-orange-400" />
                        <span>ROI CALCULATED IN DAYS, NOT MONTHS</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-medium mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 drop-shadow-2xl leading-[1.05]"
                    >
                        Pricing that scales<br />with your ambition.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
                    >
                        Start for free, then add power as you need it. No hidden fees, no per-seat penalties. You pay for the intelligence you use.
                    </motion.p>

                    {/* Toggle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex items-center justify-center gap-6"
                    >
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative w-16 h-8 bg-white/5 rounded-full p-1 transition-colors hover:bg-white/10 border border-white/10"
                        >
                            <div className={`w-6 h-6 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)] transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
                            Yearly 
                            <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Save 20%</span>
                        </span>
                    </motion.div>
                </div>
            </section>

            {/* --- PRICING CARDS --- */}
            <section className="mb-32 relative z-10 w-full">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.1 + 0.4 }}
                                className={`relative p-8 rounded-3xl flex flex-col group transition-all duration-500 ${plan.variant === 'popular'
                                    ? 'bg-[#050505] border border-teal-500/30 hover:border-teal-400/50 shadow-[0_0_40px_rgba(20,184,166,0.1)] hover:shadow-[0_0_60px_rgba(20,184,166,0.2)] hover:-translate-y-2'
                                    : plan.variant === 'enterprise'
                                        ? 'bg-gradient-to-b from-[#0A0A0A] to-[#030303] border border-white/10 hover:border-white/20 hover:-translate-y-1'
                                        : 'bg-[#050505] border border-white/5 hover:border-white/10 hover:-translate-y-1'
                                    }`}
                            >
                                {plan.variant === 'popular' && (
                                    <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent rounded-3xl pointer-events-none" />
                                )}

                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(45,212,191,0.5)] border border-teal-300/30 z-10">
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="mb-8 relative z-10">
                                    <h3 className={`text-xl font-bold mb-4 tracking-tight ${plan.variant === 'popular' ? 'text-teal-400' : 'text-gray-200'}`}>{plan.name}</h3>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-5xl font-medium tracking-tighter text-white drop-shadow-md">{plan.price}</span>
                                        {plan.price !== '$0' && plan.price !== 'Custom' && <span className="text-gray-500 font-light">/mo</span>}
                                    </div>
                                    <p className="text-gray-400 text-sm font-light leading-relaxed min-h-[60px]">{plan.description}</p>
                                </div>

                                <div className="flex-1 mb-8 relative z-10">
                                    <div className="w-full h-px bg-white/5 mb-8" />
                                    <ul className="space-y-4">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 font-light">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.variant === 'popular' ? 'bg-teal-500/10 border border-teal-500/30' : 'bg-white/5 border border-white/10'}`}>
                                                    <CheckCircle2 size={12} className={plan.variant === 'popular' ? 'text-teal-400' : 'text-gray-400'} />
                                                </div>
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="relative z-10">
                                    {plan.variant === 'popular' ? (
                                        <Link href={plan.href} className="group/btn relative w-full inline-flex items-center justify-center px-8 py-3.5 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02] cursor-pointer">
                                            <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                            <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover/btn:bg-opacity-0 transition-all duration-500 z-0"></div>
                                            <span className="relative z-20 flex items-center gap-2 text-sm font-semibold text-white transition-all duration-300">
                                                {plan.cta}
                                                <ArrowRight size={16} className="text-orange-300 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all duration-300" />
                                            </span>
                                        </Link>
                                    ) : (
                                        <Link href={plan.href} className="w-full py-3.5 rounded-xl font-semibold text-sm text-center transition-all bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center backdrop-blur-sm">
                                            {plan.cta}
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FAIR PRICING / VALUE SECTION --- */}
            <section className="mb-32 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505] to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-xs font-semibold text-teal-400 mb-6 uppercase tracking-wider">
                                Value Engineered
                            </div>
                            <h2 className="text-4xl md:text-5xl font-medium mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter leading-tight">
                                The cost of intelligence has collapsed.
                            </h2>
                            <p className="text-gray-400 text-lg font-light leading-relaxed mb-6">
                                Traditional B2B SaaS charges you per-seat, penalizing you for growing. We charge based on
                                <span className="text-white font-medium"> value derived</span> (executions).
                            </p>
                            <p className="text-gray-400 text-lg font-light leading-relaxed mb-10">
                                A single "Business" plan agent runs 24/7, processes 50x more data than a human, and costs less than your office coffee budget.
                            </p>

                            <div className="space-y-4">
                                <div className="p-5 rounded-2xl bg-[#050505] border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner"><Building size={20} /></div>
                                        <div>
                                            <div className="text-sm font-semibold text-white tracking-tight">Traditional Employee Cost</div>
                                            <div className="text-xs text-gray-500 font-light mt-0.5">Salary + Benefits + Overhead</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-mono font-medium">~$5,000</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mt-0.5 scale-90 origin-right">per month</div>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl bg-[#050505] border border-teal-500/30 flex items-center justify-between relative overflow-hidden shadow-[0_0_30px_rgba(20,184,166,0.1)]">
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-cyan-500/5" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]"><Bot size={20} /></div>
                                        <div>
                                            <div className="text-sm font-semibold text-white tracking-tight">Agentflox Business Agent</div>
                                            <div className="text-xs text-teal-300/80 font-light mt-0.5">24/7 Availability + Infinite Scale</div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <div className="text-teal-400 font-mono font-medium">$99</div>
                                        <div className="text-xs text-teal-500/80 uppercase tracking-widest mt-0.5 scale-90 origin-right">per month</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 to-purple-500/20 blur-[80px] opacity-30 group-hover:opacity-50 transition-opacity duration-700 -z-10" />
                            <div className="relative bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">
                                <h3 className="text-2xl font-medium mb-8 text-white tracking-tight">Return on Investment</h3>
                                <div className="space-y-6">
                                    {[
                                        { label: "Sales Development", gain: "+300% Leads", saved: "40 hrs/wk" },
                                        { label: "Customer Support", gain: "Instant Response", saved: "120 hrs/wk" },
                                        { label: "Data Entry", gain: "100% Accuracy", saved: "25 hrs/wk" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center pb-5 border-b border-white/5 last:border-0 last:pb-0">
                                            <span className="text-gray-300 font-light">{item.label}</span>
                                            <div className="text-right">
                                                <div className="text-emerald-400 font-medium text-sm">{item.gain}</div>
                                                <div className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">{item.saved} saved</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-10 pt-8 border-t border-white/10 text-center bg-gradient-to-b from-transparent to-white/[0.02] -mx-10 -mb-10 p-10 rounded-b-3xl">
                                    <p className="text-sm text-gray-400 mb-4 font-light italic">"We saved $120k in our first quarter using Agentflox."</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-8 h-8 bg-[#111] border border-white/10 rounded-full flex items-center justify-center shadow-inner" />
                                        <span className="text-sm font-semibold text-white tracking-tight">Acme Corp</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- COMPARISON TABLE --- */}
            <section className="mb-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-medium mb-4 tracking-tighter">Compare Features</h2>
                        <p className="text-gray-400 font-light text-lg">Detailed breakdown of what's included in each plan.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-white/5 rounded-2xl hidden md:table">
                            <thead>
                                <tr className="border-b border-white/10 bg-[#050505]">
                                    <th className="py-6 px-8 text-sm font-medium text-gray-400 w-1/4 rounded-tl-2xl">Features</th>
                                    <th className="py-6 px-6 text-sm font-bold text-white w-1/5">Free</th>
                                    <th className="py-6 px-6 text-sm font-bold text-white w-1/5">Basic</th>
                                    <th className="py-6 px-6 text-sm font-bold text-teal-400 w-1/5 bg-teal-500/5">Business</th>
                                    <th className="py-6 px-6 text-sm font-bold text-white w-1/5 rounded-tr-2xl">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisons.map((section, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                        <tr className="bg-white/[0.02]">
                                            <td colSpan={5} className="py-4 px-8 text-xs font-bold text-gray-400 uppercase tracking-widest mt-8">
                                                {section.category}
                                            </td>
                                        </tr>
                                        {section.features.map((row, rIdx) => (
                                            <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-5 px-8 text-sm text-gray-300 font-light">{row.name}</td>
                                                <td className="py-5 px-6 text-sm text-gray-400 font-light">
                                                    {typeof row.free === 'boolean'
                                                        ? (row.free ? <Check size={16} className="text-emerald-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.free}
                                                </td>
                                                <td className="py-5 px-6 text-sm text-gray-400 font-light">
                                                    {typeof row.basic === 'boolean'
                                                        ? (row.basic ? <Check size={16} className="text-emerald-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.basic}
                                                </td>
                                                <td className="py-5 px-6 text-sm text-white font-medium bg-teal-500/5">
                                                    {typeof row.business === 'boolean'
                                                        ? (row.business ? <Check size={16} className="text-teal-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.business}
                                                </td>
                                                <td className="py-5 px-6 text-sm text-gray-400 font-light">
                                                    {typeof row.enterprise === 'boolean'
                                                        ? (row.enterprise ? <Check size={16} className="text-emerald-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.enterprise}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Mobile view for table can go here if needed, keeping simple for now */}
                    </div>
                </div>
            </section>

            {/* --- TRUSTED BY --- */}
            <section className="mb-32 py-24 bg-[#050505] border-y border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-cyan-500/5 opacity-50 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-gray-400 mb-6 uppercase tracking-wider">
                            Why Agentflox?
                        </div>
                        <h2 className="text-4xl md:text-5xl font-medium mb-6 text-white tracking-tighter">Trusted by Millions</h2>
                        <p className="text-gray-400 text-lg font-light leading-relaxed max-w-md">
                            Join over 10 million users who streamline their workflows,
                            communicate efficiently, and get work done faster with Agentflox.
                        </p>
                    </div>
                    <div className="p-10 rounded-3xl bg-[#0A0A0A] border border-white/5 shadow-2xl relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[50px] pointer-events-none" />
                        <p className="text-xs font-mono text-gray-500 mb-8 uppercase tracking-widest">Trusted by innovators at</p>
                        <div className="flex flex-wrap gap-x-12 gap-y-10 grayscale opacity-40 items-center">
                            <span className="text-2xl font-bold font-serif text-white hover:opacity-100 transition-opacity cursor-default">VOGUE</span>
                            <span className="text-2xl font-bold font-sans tracking-tighter text-white hover:opacity-100 transition-opacity cursor-default">stripe</span>
                            <span className="text-2xl font-bold font-mono text-white hover:opacity-100 transition-opacity cursor-default">vercel</span>
                            <span className="text-2xl font-bold font-serif italic text-white hover:opacity-100 transition-opacity cursor-default">The New York Times</span>
                            <span className="text-2xl font-bold font-sans text-white hover:opacity-100 transition-opacity cursor-default">Linear</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ --- */}
            <FAQSection />

            {/* --- CTA --- */}
            <section className="mb-24 relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="relative rounded-[3rem] p-16 md:p-24 overflow-hidden text-center border border-white/5 bg-[#050505] group hover:border-teal-500/20 transition-colors duration-700 shadow-2xl">
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-600/20 blur-[150px] rounded-full pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <h2 className="text-5xl md:text-7xl font-medium mb-8 tracking-tighter drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                                Ready to build the future?
                            </h2>
                            <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                                Join the fastest-growing platform for autonomous agents. Start saving thousands of hours today.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
                                <Link
                                    href={ROUTES.SIGNUP}
                                    className="group/btn relative inline-flex items-center justify-center px-10 py-4 font-bold text-white transition-all duration-500 rounded-xl hover:scale-[1.02] w-full sm:w-auto"
                                >
                                    <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-400 opacity-80 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                    <div className="absolute inset-[1.5px] rounded-[10.5px] bg-[#050505] group-hover/btn:bg-opacity-0 transition-all duration-500 z-0"></div>
                                    <span className="relative z-20 flex items-center gap-3 text-base font-semibold text-white transition-all duration-300">
                                        Start Building Free
                                        <ArrowRight size={18} className="text-orange-300 group-hover/btn:text-white group-hover/btn:translate-x-1.5 transition-all duration-300" />
                                    </span>
                                </Link>
                                <Link
                                    href="/contact"
                                    className="w-full sm:w-auto px-10 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-medium text-base transition-all flex items-center justify-center backdrop-blur-sm"
                                >
                                    Contact Sales
                                </Link>
                            </div>

                            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={12} className="text-emerald-400" /></div>
                                    <span className="font-light">No credit card required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={12} className="text-emerald-400" /></div>
                                    <span className="font-light">14-day free trial on Pro</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

const FAQSection = () => {
    const questions = [
        { q: "Does Business plan include unlimited agents?", a: "Yes, our Business plan allows you to create and orchestrate unlimited autonomous agents." },
        { q: "How many executions do I need?", a: "Most users start with 5,000 to automate core workflows. You can always upgrade as you scale." },
        { q: "What happens if I run out of limits?", a: "We provide a 10% overflow buffer. After that, executions pause until the next cycle or upgrade." },
        { q: "Which plan includes integrations?", a: "Basic includes standard integrations (Slack, Gmail). Business includes advanced (HubSpot, Salesforce)." },
        { q: "Best plan for internal tools?", a: "The Basic plan is ideal for internal tools with up to 3 team members." },
        { q: "Best plan for agencies?", a: "Business is designed for agencies, offering multi-tenant support and client management features." },
        { q: "Which plan supports custom domains?", a: "Custom domains for white-labeling are available on the Business and Enterprise plans." },
        { q: "When is Agentflox branding removed?", a: "Branding is removed on the Business plan and above." },
        { q: "Can I upgrade later without data loss?", a: "Absolutely. scaling is seamless and all your agents and memory vectors are preserved." },
        { q: "Who owns the agents and data?", a: "You do. You retain 100% ownership of your prompts, configurations, and generated data." }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="mb-32 max-w-4xl mx-auto px-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-teal-500/5 blur-[100px] pointer-events-none -z-10" />
            <div className="text-center mb-16">
                <h2 className="text-4xl font-medium mb-4 tracking-tighter text-white">Frequently Asked Questions</h2>
                <p className="text-gray-400 font-light text-lg">Everything you need to know about billing and capabilities.</p>
            </div>

            <div className="grid gap-y-4">
                {questions.map((item, i) => (
                    <div key={i} className="border border-white/5 rounded-2xl bg-[#050505] overflow-hidden hover:border-white/10 transition-colors">
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full flex items-center justify-between text-left p-6 hover:bg-white/[0.02] transition-colors group"
                        >
                            <span className="font-medium text-gray-200 text-lg group-hover:text-white transition-colors">{item.q}</span>
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${openIndex === i ? 'border-teal-500/30 bg-teal-500/10 text-teal-400' : 'border-white/10 text-gray-500 group-hover:text-white group-hover:border-white/30'}`}>
                                <Plus size={16} className={`transform transition-transform duration-300 ${openIndex === i ? 'rotate-45' : ''}`} />
                            </div>
                        </button>
                        <AnimatePresence>
                            {openIndex === i && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-6 pt-0 text-base text-gray-400 font-light leading-relaxed border-t border-white/5">
                                        {item.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </section>
    );
};

