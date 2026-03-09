"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronRight, ChevronDown, Bot, Workflow, Users, Briefcase, Building2, Rocket, GraduationCap, BookOpen, MessageSquare, Play, LifeBuoy, Headphones, Sparkles, Zap, Globe, Shield, Code, LayoutGrid, ArrowRight, TrendingUp } from 'lucide-react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { ROUTES } from '../../lib/config';

interface MegaMenuItem {
    name: string;
    href: string;
    description: string;
    icon: React.ReactNode;
}

interface NavItem {
    name: string;
    href?: string;
    children?: { name: string; href: string; description: string }[];
    megaMenu?: {
        featured?: { title: string; description: string; href: string; image?: string };
        columns: { title: string; items: MegaMenuItem[] }[];
    };
}

export const Navigation = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const navRef = useRef<HTMLElement>(null);
    const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > 20;
            setIsScrolled(scrolled);

            if (navRef.current) {
                gsap.to(navRef.current, {
                    backgroundColor: scrolled ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0)',
                    backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
                    borderColor: scrolled ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0)',
                    duration: 0.3,
                    ease: 'power2.out',
                });
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isMobileMenuOpen) {
            gsap.fromTo('.mobile-menu-item',
                { opacity: 0, y: -10 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.05 }
            );
        }
    }, [isMobileMenuOpen]);

    const handleMenuEnter = (menuName: string) => {
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
        setActiveMenu(menuName);
    };

    const handleMenuLeave = () => {
        menuTimeoutRef.current = setTimeout(() => {
            setActiveMenu(null);
        }, 150);
    };

    const navItems: NavItem[] = [
        {
            name: 'Product',
            megaMenu: {
                featured: {
                    title: 'Multi-Agent Orchestration',
                    description: 'Deploy autonomous AI agents that collaborate, reason, and execute complex workflows.',
                    href: '/product/agents',
                },
                columns: [
                    {
                        title: 'Platform',
                        items: [
                            { name: 'AI Agents', href: '/product/agents', description: 'Build & deploy intelligent agents', icon: <Bot size={20} /> },
                            { name: 'Automation', href: '/product/automation', description: 'Visual workflow builder', icon: <Workflow size={20} /> },
                            { name: 'Collaboration', href: '/product/collaboration', description: 'Real-time team workspace', icon: <Users size={20} /> },
                            { name: 'Project Management', href: '/product/project-management', description: 'Enterprise PM suite', icon: <LayoutGrid size={20} /> },
                        ]
                    },
                    {
                        title: 'Ecosystem',
                        items: [
                            { name: 'Marketplace', href: '/product/marketplace', description: 'Find agents, templates & talent', icon: <Globe size={20} /> },
                            { name: 'Integrations', href: '/product/integrations', description: '100+ native integrations', icon: <Code size={20} /> },
                            { name: 'API & SDK', href: '/product/api', description: 'Developer-first platform', icon: <Zap size={20} /> },
                            { name: 'Security', href: '/product/security', description: 'Enterprise-grade protection', icon: <Shield size={20} /> },
                        ]
                    }
                ]
            }
        },
        {
            name: 'Solutions',
            megaMenu: {
                columns: [
                    {
                        title: 'Company Size',
                        items: [
                            { name: 'Enterprise', href: '/solutions/enterprise', description: 'For large organizations', icon: <Building2 size={20} /> },
                            { name: 'Startups', href: '/solutions/startups', description: 'Scale faster with AI', icon: <Rocket size={20} /> },
                            { name: 'Small Business', href: '/solutions/smb', description: 'Grow efficient teams', icon: <Briefcase size={20} /> },
                            { name: 'Agencies', href: '/solutions/agencies', description: 'Manage multiple clients', icon: <LayoutGrid size={20} /> },
                        ]
                    },
                    {
                        title: 'Teams',
                        items: [
                            { name: 'Project Mgmt', href: '/solutions/project-management', description: 'Automate project tracking', icon: <LayoutGrid size={20} /> },
                            { name: 'Product', href: '/solutions/product-management', description: 'Roadmapping & strategy', icon: <Zap size={20} /> },
                            { name: 'IT & Eng', href: '/solutions/engineering', description: 'DevOps & automation', icon: <Code size={20} /> },
                            { name: 'Marketing', href: '/solutions/marketing', description: 'Campaign automation', icon: <Sparkles size={20} /> },
                            { name: 'HR', href: '/solutions/hr', description: 'Recruiting & onboarding', icon: <Users size={20} /> },
                            { name: 'Sales', href: '/solutions/sales', description: 'Pipeline intelligence', icon: <TrendingUp size={20} /> },
                            { name: 'Operations', href: '/solutions/operations', description: 'Process optimization', icon: <Workflow size={20} /> },
                        ]
                    },
                    {
                        title: 'Industries',
                        items: [
                            { name: 'Finance', href: '/solutions/finance', description: 'Compliance & analysis', icon: <Building2 size={20} /> },
                            { name: 'Education', href: '/solutions/education', description: 'Learning management', icon: <GraduationCap size={20} /> },
                            { name: 'Construction', href: '/solutions/construction', description: 'Field coordination', icon: <Briefcase size={20} /> },
                        ]
                    }
                ]
            }
        },
        {
            name: 'Learn',
            megaMenu: {
                columns: [
                    {
                        title: 'Learn',
                        items: [
                            { name: 'Documentation', href: '/docs', description: 'Comprehensive guides & API', icon: <BookOpen size={20} /> },
                            { name: 'Tutorials', href: '/learn/tutorials', description: 'Step-by-step learning', icon: <GraduationCap size={20} /> },
                            { name: 'Demos', href: '/learn/demos', description: 'See it in action', icon: <Play size={20} /> },
                            { name: 'Blog', href: '/learn/blog', description: 'Latest insights & news', icon: <MessageSquare size={20} /> },
                        ]
                    },
                    {
                        title: 'Community',
                        items: [
                            { name: 'Community Forum', href: '/learn/community', description: 'Connect with peers', icon: <Users size={20} /> },
                            { name: 'Webinars', href: '/learn/webinars', description: 'Live learning sessions', icon: <Sparkles size={20} /> },
                        ]
                    },
                    {
                        title: 'Support',
                        items: [
                            { name: 'Help Center', href: '/learn/help', description: 'FAQs & troubleshooting', icon: <LifeBuoy size={20} /> },
                            { name: '24/7 Support', href: '/learn/support', description: 'Priority assistance', icon: <Headphones size={20} /> },
                        ]
                    }
                ]
            }
        },
        {
            name: 'Agentflox AI',
            megaMenu: {
                featured: {
                    title: 'The Future of Work',
                    description: 'Experience autonomous AI agents that think, plan, and execute alongside your team.',
                    href: '/agentflox-ai',
                },
                columns: [
                    {
                        title: 'Features',
                        items: [
                            { name: 'Agent Builder', href: '/agentflox-ai/agent-builder', description: 'Visual agent creation', icon: <Bot size={20} /> },
                            { name: 'Workflow AI', href: '/agentflox-ai/workflows', description: 'Intelligent automation', icon: <Workflow size={20} /> },
                            { name: 'Agent Marketplace', href: '/agentflox-ai/marketplace', description: 'Pre-built agent templates', icon: <Sparkles size={20} /> },
                        ]
                    }
                ]
            }
        },
    ];

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? 'bg-[#030303]/80 backdrop-blur-md border-b border-white/5'
                    : 'bg-transparent'
                    }`}
            >
                {/* Announcement Bar */}
                <div className="bg-[#080808] border-b border-white/5 py-2 hidden sm:block">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center text-xs font-light tracking-wide text-gray-400 gap-2">
                        <span className=" px-1.5 py-0.5 rounded-sm bg-indigo-500/10 text-indigo-400 font-medium">NEW</span>
                        <span>Agentflox Enterprise is now generally available.</span>
                        <Link href="/enterprise" className="text-white hover:text-indigo-400 font-medium flex items-center gap-1 transition-colors">
                            Read Launch Post <ArrowRight size={10} />
                        </Link>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 flex items-center justify-center">
                                <span className="text-2xl font-bold tracking-tighter text-white">A</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                                Agentflox
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => (
                                <div
                                    key={item.name}
                                    className="relative group px-4 py-2"
                                    onMouseEnter={() => handleMenuEnter(item.name)}
                                    // Use the handleMenuLeave which includes a delay
                                    onMouseLeave={handleMenuLeave}
                                >
                                    <button
                                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${activeMenu === item.name ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {item.name}
                                        {(item.megaMenu || item.children) && <ChevronDown size={14} className={`transition-transform duration-200 ${activeMenu === item.name ? 'rotate-180' : ''}`} />}
                                    </button>

                                    {/* Mega Menu Dropdown */}
                                    {item.megaMenu && activeMenu === item.name && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 w-max max-w-screen-2xl">
                                            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-6 flex gap-8 backdrop-blur-3xl min-w-[600px]">
                                                {/* Featured Section */}
                                                {item.megaMenu.featured && (
                                                    <div className="w-64 shrink-0 p-4 rounded-lg bg-white/5 border border-white/5">
                                                        <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Featured</div>
                                                        <Link href={item.megaMenu.featured.href} className="block group/featured">
                                                            <div className="text-white font-medium mb-1 group-hover/featured:text-indigo-300 transition-colors">{item.megaMenu.featured.title}</div>
                                                            <div className="text-sm text-gray-400 font-light leading-relaxed">{item.megaMenu.featured.description}</div>
                                                        </Link>
                                                    </div>
                                                )}

                                                {/* Columns */}
                                                <div className={`grid gap-8 ${(item.megaMenu.columns.length === 3) ? 'grid-cols-3 min-w-[600px]' :
                                                    (item.name === 'Solutions') ? 'grid-cols-3 min-w-[700px]' : 'grid-cols-2'
                                                    }`}>
                                                    {item.megaMenu.columns.map((col, colIdx) => (
                                                        <div key={colIdx} className="min-w-[180px]">
                                                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{col.title}</div>
                                                            <div className="space-y-1">
                                                                {col.items.map((menuItem) => (
                                                                    <Link
                                                                        key={menuItem.name}
                                                                        href={menuItem.href}
                                                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group/item"
                                                                    >
                                                                        <div className="mt-0.5 text-gray-500 group-hover/item:text-indigo-400 transition-colors shrink-0">
                                                                            {menuItem.icon}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-medium text-gray-300 group-hover/item:text-white transition-colors">{menuItem.name}</div>
                                                                            <div className="text-xs text-gray-400 font-light leading-snug">{menuItem.description}</div>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Link
                                href="/pricing"
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Pricing
                            </Link>
                        </nav>

                        {/* CTA Buttons */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link
                                href={ROUTES.LOGIN}
                                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href={ROUTES.SIGNUP}
                                className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-sm hover:bg-gray-200 transition-colors"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {isMobileMenuOpen && (
                        <div className="lg:hidden py-6 space-y-2 border-t border-white/10 mt-4 max-h-[70vh] overflow-y-auto">
                            {navItems.map((item) => (
                                <div key={item.name} className="mobile-menu-item">
                                    {item.href ? (
                                        <Link
                                            href={item.href}
                                            className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {item.name}
                                        </Link>
                                    ) : (
                                        <div className="px-4 py-3">
                                            <div className="text-white font-medium mb-2">{item.name}</div>
                                            {item.megaMenu?.columns.map((col, colIdx) => (
                                                <div key={colIdx} className="ml-4 space-y-1 mb-3">
                                                    <div className="text-xs text-gray-500 uppercase tracking-wider">{col.title}</div>
                                                    {col.items.map((menuItem) => (
                                                        <Link
                                                            key={menuItem.name}
                                                            href={menuItem.href}
                                                            className="block py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                        >
                                                            {menuItem.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="pt-4 space-y-3 border-t border-white/10 px-4">
                                <Link href={ROUTES.LOGIN} className="mobile-menu-item block w-full px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white transition-colors text-center border border-white/10 rounded-full">
                                    Sign In
                                </Link>
                                <Link href={ROUTES.SIGNUP} className="mobile-menu-item block w-full px-5 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-full text-sm font-semibold text-white text-center">
                                    Start Free
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};
