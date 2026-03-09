import Link from 'next/link';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Copy,
    FileIcon,
    Github,
    Info,
    Lightbulb,
    MessageSquare,
} from 'lucide-react';

export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const slugPath = slug.join('/');

    // Mock content generation based on slug
    const getContent = (slug: string) => {
        switch (slug) {
            case 'introduction':
                return {
                    title: "Introduction",
                    description: "Learn how Agentflox helps you build, deploy, and scale autonomous AI agent systems.",
                    content: `
            <p className="text-xl text-slate-400 font-light leading-relaxed mb-12">
              Agentflox is the premier unified ecosystem designed to accelerate the venture creation lifecycle. 
              By synthesizing high-fidelity collaboration tools with intelligent discovery mechanisms, 
              Agentflox empowers innovators, investors, and professionals to transcend traditional boundaries.
            </p>

            <h2 className="text-2xl font-bold mt-16 mb-6">The Venture Operating System</h2>
            <p className="mb-6">
              It is not merely a project management tool; it is a <strong>venture operating system</strong> 
              designed to turn ambitious ideas into enduring realities. Agentflox delivers a seamless, 
              high-performance user experience centered around four strategic pillars.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-indigo-500/30 transition-all group">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3">Enterprise Workspaces</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Fundamental unit of collaboration designed for complete tenant isolation and data sovereignty.
                </p>
              </div>
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-indigo-500/30 transition-all group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <Lightbulb size={24} />
                </div>
                <h3 className="text-lg font-bold mb-3">Venture Discovery</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Acts as a global stage for innovation, replacing fragmented networking with a centralized ecosystem.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-16 mb-6">Core Experience</h2>
            <p className="mb-6">
              Agentflox delivers a seamless, high-performance user experience centered around strategic principles.
              Moving beyond simple messaging, we implement a formal Proposal System that transforms casual 
              conversations into actionable business opportunities.
            </p>

            <div className="bg-indigo-500/5 border-l-4 border-indigo-500 p-6 my-8 rounded-r-xl">
              <div className="flex items-center gap-3 text-indigo-400 mb-2">
                <Info size={18} />
                <span className="font-bold uppercase tracking-wider text-xs">A Note on Scalability</span>
              </div>
              <p className="text-sm text-slate-300">
                Powered by an enterprise-grade Socket.IO infrastructure, Agentflox ensures 100% data consistency 
                and immediacy across all regions.
              </p>
            </div>
          `,
                    toc: [
                        { title: "The Venture OS", id: "os" },
                        { title: "Core Experience", id: "experience" },
                        { title: "Key Pillars", id: "pillars" }
                    ]
                };
            case 'quick-start':
                return {
                    title: "Quick Start Guide",
                    description: "Get up and running with Agentflox in less than 5 minutes.",
                    content: `
            <p className="text-slate-400 mb-12">
              Welcome! This guide will walk you through setting up your first workspace and deploying your 
              first AI agent using the Agentflox CLI.
            </p>

            <h2 className="text-2xl font-bold mt-12 mb-6">Prerequisites</h2>
            <ul className="list-disc ml-6 space-y-3 mb-10 text-slate-300">
              <li>Node.js 18.17.0 or higher</li>
              <li>pnpm 8.0.0 or higher</li>
              <li>An Agentflox Account</li>
            </ul>

            <h2 className="text-2xl font-bold mt-12 mb-6">1. Install the CLI</h2>
            <p className="mb-4">Install the global CLI to manage your swarms and agents from the terminal.</p>
            <div className="relative group mb-10">
              <div className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer transition-colors p-2 bg-slate-800 rounded-md">
                <Copy size={16} />
              </div>
              <pre className="bg-slate-900 border border-slate-800 p-6 rounded-xl font-mono text-indigo-300 overflow-x-auto">
                npm install -g @agentflox/cli
              </pre>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-6">2. Initialize Workspace</h2>
            <p className="mb-4">Navigate to your project directory and run the initialization command.</p>
            <div className="relative group mb-10">
              <div className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer transition-colors p-2 bg-slate-800 rounded-md">
                <Copy size={16} />
              </div>
              <pre className="bg-slate-900 border border-slate-800 p-6 rounded-xl font-mono text-indigo-300 overflow-x-auto">
                agentflox init my-agent-swarm
              </pre>
            </div>

            <div className="bg-amber-500/5 border-l-4 border-amber-500 p-6 my-8 rounded-r-xl">
              <div className="flex items-center gap-3 text-amber-500 mb-2">
                <AlertTriangle size={18} />
                <span className="font-bold uppercase tracking-wider text-xs">Security Warning</span>
              </div>
              <p className="text-sm text-slate-300">
                Never share your <code>AGENT_SECRET_KEY</code> in public repositories. Use environment 
                variables for all sensitive tokens.
              </p>
            </div>
          `,
                    toc: [
                        { title: "Prerequisites", id: "prereq" },
                        { title: "Install CLI", id: "install" },
                        { title: "Initialize", id: "init" },
                        { title: "Security", id: "security" }
                    ]
                };
            default:
                return {
                    title: "Platform Overview",
                    description: "Deep dive into the architecture and capabilities of the Agentflox ecosystem.",
                    content: `
             <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 mb-8">
                  <FileIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-4">Documentation page under construction</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                  We're currently refactoring our documentation system. 
                  In the meantime, check out the <Link href="/docs/introduction" className="text-indigo-400 hover:underline">Introduction</Link> or <Link href="/docs/quick-start" className="text-indigo-400 hover:underline">Quick Start</Link> guides.
                </p>
             </div>
          `,
                    toc: []
                };
        }
    };

    const data = getContent(slugPath);

    return (
        <div className="flex flex-col lg:flex-row gap-12 relative">
            <div className="flex-1 max-w-3xl">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 mb-10 text-xs font-medium text-slate-500">
                    <Link href="/learn/docs" className="hover:text-indigo-400 transition-colors uppercase tracking-wider">Docs</Link>
                    <ChevronRight size={12} />
                    <span className="text-indigo-400/80 uppercase tracking-wider truncate max-w-[200px]">{slugPath.split('/').join(' / ')}</span>
                </nav>

                {/* Hero */}
                <header className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
                        {data.title}
                    </h1>
                    <p className="text-xl text-slate-400 font-light leading-relaxed">
                        {data.description}
                    </p>
                </header>

                {/* Content Render */}
                <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: data.content }} />

                {/* Footer Navigation */}
                <footer className="mt-24 pt-12 border-t border-slate-800/50">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Last Updated</span>
                            <span className="text-sm text-slate-300">March 8, 2026</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link href="#" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                                <Github size={16} /> Edit this page
                            </Link>
                            <Link href="#" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                                <MessageSquare size={16} /> Community support
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
                        <Link href="#" className="p-6 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group flex flex-col items-start gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400 transition-colors">Previous</span>
                            <span className="text-lg font-bold text-slate-200">Introduction</span>
                        </Link>
                        <Link href="/docs/quick-start" className="p-6 bg-slate-900/30 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all group flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400 transition-colors">Next</span>
                            <span className="text-lg font-bold text-slate-200">Quick Start</span>
                        </Link>
                    </div>

                    <div className="mt-16 flex flex-col items-center justify-center gap-6 p-12 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl text-center">
                        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                            <Lightbulb size={24} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold">Was this page helpful?</h3>
                            <p className="text-slate-400 text-sm">Your feedback helps us improve the Agentflox experience for everyone.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium hover:border-indigo-500/50 hover:bg-slate-800 transition-all">Yes, very!</button>
                            <button className="px-6 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium hover:border-red-500/50 hover:bg-slate-800 transition-all">Not really</button>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Table of Contents - Right Sidebar */}
            {data.toc && data.toc.length > 0 && (
                <aside className="hidden xl:block w-64 shrink-0">
                    <div className="sticky top-32 flex flex-col gap-8">
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">On this page</h3>
                            <nav className="flex flex-col gap-3">
                                {data.toc.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={`#${item.id}`}
                                        className="text-sm text-slate-400 hover:text-indigo-400 transition-all border-l-2 border-transparent hover:border-indigo-500/50 pl-4 py-0.5"
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div className="pt-8 border-t border-slate-800/50 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Join our Discord</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">Collaborate with thousands of AI engineers and innovators.</p>
                                <Link href="#" className="text-xs font-bold text-indigo-400 hover:underline mt-1">Join Workspace →</Link>
                            </div>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
