"use client";
import React from 'react';
import { Twitter, Linkedin, Github, Mail, ArrowRight, Bot, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { name: 'AI Agents', href: '/product/agents' },
            { name: 'Automation', href: '/product/automation' },
            { name: 'Collaboration', href: '/product/collaboration' },
            { name: 'Project Management', href: '/product/project-management' },
            { name: 'Marketplace', href: '/product/marketplace' },
            { name: 'Integrations', href: '/product/integrations' },
            { name: 'AI & SDK', href: '/product/api' },
        ],
        resources: [
            { name: 'Documentation', href: 'https://docs.agentflox.com' },
            { name: 'Tutorials', href: '/learn/tutorials' },
            { name: 'Blog', href: '/learn/blog' },
            { name: 'Community', href: '/learn/community' },
            { name: 'Webinars', href: '/learn/webinars' },
            { name: 'Help Center', href: '/learn/help' },
            { name: 'Get Support', href: '/learn/support' },
            { name: 'Contact Us', href: '/contact' },
            { name: 'Pricing', href: '/pricing' },
            { name: 'Affiliates', href: '/affiliates' },
        ],
        company: [
            { name: 'About Us', href: '/about' },
            { name: 'Careers', href: '/careers' },
            { name: 'Partners', href: '/partners' },
            { name: 'Legal', href: '/legal' },
            { name: 'Privacy', href: '/legal/privacy' },
            { name: 'Security', href: '/product/security' },
            { name: 'Terms', href: '/legal/terms' },
        ],
    };

    const socialLinks = [
        { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/agentflox' },
        { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/agentflox' },
        { name: 'GitHub', icon: Github, href: 'https://github.com/agentflox' },
        { name: 'Email', icon: Mail, href: 'mailto:hello@agentflox.com' },
    ];

    return (
        <footer className="relative bg-slate-950/80 backdrop-blur-sm border-t border-white/5">
            {/* Gradient top border */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Main Footer Content */}
                {/* Main Footer Content */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-16">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="inline-block text-2xl font-bold tracking-tighter mb-6">
                            Agentflox
                            <span className="text-indigo-500">.</span>
                        </Link>
                        <p className="text-gray-500 mb-6 leading-relaxed font-light text-sm">
                            The operating system for modern ventures. Orchestrate agents, automate workflows, and scale your ambition.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <a key={i} href={item.href} className="p-2 bg-white/5 rounded-full hover:bg-white/10 hover:text-indigo-400 transition-colors">
                                        <Icon size={16} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Product Column */}
                    <div>
                        <h4 className="font-semibold mb-6">Product</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            {footerLinks.product.map((item) => (
                                <li key={item.name}>
                                    <Link href={item.href} className="hover:text-white transition-colors">{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h4 className="font-semibold mb-6">Resources</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            {footerLinks.resources.map((item) => (
                                <li key={item.name}>
                                    <Link href={item.href} className="hover:text-white transition-colors">{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h4 className="font-semibold mb-6">Company</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            {footerLinks.company.map((item) => (
                                <li key={item.name}>
                                    <Link href={item.href} className="hover:text-white transition-colors">{item.name}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter Column */}
                    <div className="col-span-2 md:col-span-2 lg:col-span-1">
                        <h4 className="font-semibold mb-6">Stay Updated</h4>
                        <p className="text-gray-500 mb-4 text-sm font-light">
                            Get the latest updates on AI agents and venture orchestration.
                        </p>
                        <form className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full bg-[#080808] border border-white/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors text-white placeholder-gray-600"
                            />
                            <button className="w-full bg-white text-black py-3 rounded-sm font-medium hover:bg-gray-200 transition-colors text-sm">
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-gray-600 text-sm">
                        © {currentYear} Agentflox Inc. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm text-gray-600">
                        <Link href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-gray-400 transition-colors">Cookie Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
