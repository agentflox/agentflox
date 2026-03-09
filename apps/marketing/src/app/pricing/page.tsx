"use client";
import React, { useState } from 'react';
import { Navigation } from '../_components/Navigation';
import { Footer } from '../_components/Footer';
import { Check, X, HelpCircle, ArrowRight, Zap, Shield, Bot, Building, Globe, CheckCircle2, Minus, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
// import { ROUTES } from '@/lib/config'; // corrected import path if necessary, but preserving relative as it was working
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
        <div className="min-h-screen bg-[#050505] text-slate-50 selection:bg-indigo-500/30 font-sans">
            <Navigation />

            {/* --- HERO SECTION --- */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-indigo-400 mb-6"
                    >
                        <Zap size={12} />
                        <span>ROI CALCULATED IN DAYS, NOT MONTHS</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
                    >
                        Pricing that scales<br />with your ambition.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
                    >
                        Start for free, then add power as you need it. No hidden fees, no per-seat penalties. You pay for the intelligence you use.
                    </motion.p>

                    {/* Toggle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex items-center justify-center gap-4"
                    >
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
                        <button
                            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                            className="relative w-16 h-8 bg-white/10 rounded-full p-1 transition-colors hover:bg-white/20 ring-1 ring-white/5"
                        >
                            <div className={`w-6 h-6 bg-indigo-500 rounded-full shadow-lg transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
                            Yearly <span className="text-green-400 text-xs ml-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">-20%</span>
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
                                className={`relative p-6 rounded-2xl border flex flex-col group transition-all duration-300 ${plan.variant === 'popular'
                                    ? 'bg-[#0f1016] border-indigo-500/50 hover:border-indigo-500 shadow-2xl shadow-indigo-500/10'
                                    : plan.variant === 'enterprise'
                                        ? 'bg-gradient-to-b from-[#111] to-black border-white/10 hover:border-white/20'
                                        : 'bg-[#0A0A0A] border-white/5 hover:border-white/10'
                                    }`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className={`text-lg font-bold mb-2 ${plan.variant === 'popular' ? 'text-white' : 'text-gray-200'}`}>{plan.name}</h3>
                                    <div className="h-12 flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                                        {plan.price !== '$0' && plan.price !== 'Custom' && <span className="text-gray-500 text-sm">/mo</span>}
                                    </div>
                                    <p className="text-gray-500 text-sm mt-4 leading-relaxed min-h-[60px]">{plan.description}</p>
                                </div>

                                <div className="flex-1 mb-6">
                                    <div className="w-full h-px bg-white/5 mb-6" />
                                    <ul className="space-y-3">
                                        {plan.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm text-gray-400">
                                                <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${plan.variant === 'popular' ? 'text-indigo-400' : 'text-gray-600'}`} />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Link
                                    href={plan.href}
                                    className={`w-full py-3 rounded-lg font-semibold text-sm text-center transition-all ${plan.variant === 'popular'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- FAIR PRICING / VALUE SECTION --- */}
            <section className="mb-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="text-indigo-400 font-mono text-xs mb-4">Why is this price fair?</div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">The cost of intelligence has collapsed.</h2>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                Traditional B2B SaaS charges you per-seat, penalizing you for growing. We charge based on
                                <span className="text-white font-medium"> value derived</span> (executions).
                            </p>
                            <p className="text-gray-400 leading-relaxed mb-8">
                                A single "Business" plan agent runs 24/7, processes 50x more data than a human, and costs less than your office coffee budget.
                            </p>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><Building size={20} /></div>
                                        <div>
                                            <div className="text-sm font-semibold text-white">Traditional Employee Cost</div>
                                            <div className="text-xs text-gray-500">Salary + Benefits + Overhead</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-mono font-bold">~$5,000</div>
                                        <div className="text-xs text-gray-500">per month</div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/50 flex items-center justify-between relative overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Bot size={20} /></div>
                                        <div>
                                            <div className="text-sm font-semibold text-white">Agentflox Business Agent</div>
                                            <div className="text-xs text-indigo-300">24/7 Availability + Infinite Scale</div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <div className="text-white font-mono font-bold">$99</div>
                                        <div className="text-xs text-indigo-300">per month</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl opacity-30" />
                            <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-8">
                                <h3 className="text-xl font-bold mb-6">Return on Investment</h3>
                                <div className="space-y-6">
                                    {[
                                        { label: "Sales Development", gain: "+300% Leads", saved: "40 hrs/wk" },
                                        { label: "Customer Support", gain: "Instant Response", saved: "120 hrs/wk" },
                                        { label: "Data Entry", gain: "100% Accuracy", saved: "25 hrs/wk" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                            <span className="text-gray-400 font-medium">{item.label}</span>
                                            <div className="text-right">
                                                <div className="text-green-400 font-bold">{item.gain}</div>
                                                <div className="text-xs text-gray-500">{item.saved} saved</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                    <p className="text-sm text-gray-400 mb-4">"We saved $120k in our first quarter using Agentflox."</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-6 h-6 bg-white rounded-full" />
                                        <span className="text-sm font-bold text-white">Acme Corp</span>
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
                        <h2 className="text-3xl font-bold mb-4">Compare Features</h2>
                        <p className="text-gray-400">Detailed breakdown of what's included in each plan.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-4 px-6 text-sm font-medium text-gray-400 w-1/4">Features</th>
                                    <th className="py-4 px-6 text-sm font-bold text-white w-1/5">Free</th>
                                    <th className="py-4 px-6 text-sm font-bold text-white w-1/5">Basic</th>
                                    <th className="py-4 px-6 text-sm font-bold text-indigo-400 w-1/5">Business</th>
                                    <th className="py-4 px-6 text-sm font-bold text-white w-1/5">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisons.map((section, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                        <tr className="bg-white/5">
                                            <td colSpan={5} className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest mt-8">
                                                {section.category}
                                            </td>
                                        </tr>
                                        {section.features.map((row, rIdx) => (
                                            <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 text-sm text-gray-300 font-medium">{row.name}</td>
                                                <td className="py-4 px-6 text-sm text-gray-400">
                                                    {typeof row.free === 'boolean'
                                                        ? (row.free ? <Check size={16} className="text-green-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.free}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-gray-400">
                                                    {typeof row.basic === 'boolean'
                                                        ? (row.basic ? <Check size={16} className="text-green-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.basic}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-white font-medium bg-indigo-500/5">
                                                    {typeof row.business === 'boolean'
                                                        ? (row.business ? <Check size={16} className="text-indigo-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.business}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-gray-400">
                                                    {typeof row.enterprise === 'boolean'
                                                        ? (row.enterprise ? <Check size={16} className="text-green-400" /> : <Minus size={16} className="text-gray-700" />)
                                                        : row.enterprise}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* --- TRUSTED BY --- */}
            <section className="mb-32 py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-20 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
                    <div>
                        <div className="text-indigo-400 font-mono text-xs mb-4">Why Agentflox?</div>
                        <h2 className="text-4xl font-bold mb-6 text-white tracking-tight">Trusted by Millions</h2>
                        <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                            Join over 10 million users who streamline their workflows,
                            communicate efficiently, and get work done faster with Agentflox.
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-mono text-gray-500 mb-8 uppercase tracking-widest">Trusted by innovators at</p>
                        <div className="flex flex-wrap gap-x-12 gap-y-8 grayscale opacity-50 items-center">
                            {/* Simple text placeholders for logos as per requirements, normally these would be SVGs */}
                            <span className="text-2xl font-bold font-serif text-white">VOGUE</span>
                            <span className="text-2xl font-bold font-sans tracking-tighter text-white">stripe</span>
                            <span className="text-2xl font-bold font-mono text-white">vercel</span>
                            <span className="text-2xl font-bold font-serif italic text-white">The New York Times</span>
                            <span className="text-2xl font-bold font-sans text-white">Linear</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FAQ --- */}
            <FAQSection />

            {/* --- CTA --- */}
            <section className="mb-24 relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="relative rounded-[2.5rem] p-16 overflow-hidden text-center border border-white/10 bg-[#0A0A0A] group hover:border-indigo-500/30 transition-colors duration-500">
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(99,102,241,0.05),transparent)] opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/30 blur-[120px] rounded-full pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">

                            <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
                                Ready to build the future?
                            </h2>
                            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                                Join the fastest-growing platform for autonomous agents. Start saving thousands of hours today.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                <Link
                                    href={ROUTES.SIGNUP}
                                    className="w-full sm:w-auto px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                >
                                    Start Building Free
                                    <ArrowRight size={18} />
                                </Link>
                                <Link
                                    href="/contact"
                                    className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-bold text-lg transition-all flex items-center justify-center"
                                >
                                    Contact Sales
                                </Link>
                            </div>

                            <div className="mt-12 flex items-center gap-6 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-indigo-500" />
                                    <span>No credit card required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-indigo-500" />
                                    <span>14-day free trial on Pro</span>
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
        <section className="mb-32 max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-gray-400">Everything you need to know about billing and capabilities.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
                {questions.map((item, i) => (
                    <div key={i} className="border-b border-white/5 pb-6">
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full flex items-center justify-between text-left py-2 hover:text-indigo-400 transition-colors group"
                        >
                            <span className="font-semibold text-gray-200 text-lg md:text-xl group-hover:text-white transition-colors">{item.q}</span>
                            <Plus size={20} className={`text-gray-500 transform transition-transform duration-300 ${openIndex === i ? 'rotate-45 text-white' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {openIndex === i && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <p className="text-base text-gray-400 py-4 leading-relaxed">
                                        {item.a}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </section>
    );
};
