"use client";

import React from "react";
import Link from "next/link";
import {
  Terminal,
  Code2,
  Layers,
  Sparkles,
  Rocket,
  MessageSquare,
  ArrowRight,
  Github,
} from "lucide-react";

export default function DocsIndex() {
  const categories = [
    {
      title: "Getting Started",
      description: "Fundamental concepts and quick start guide for new developers.",
      icon: <Rocket className="text-indigo-400" size={24} />,
      href: "/docs/introduction",
      items: ["Architecture", "CLI Installation", "CLI Commands"],
    },
    {
      title: "Core Concepts",
      description: "Deep dive into multi-tenant workspaces and the proposal system.",
      icon: <Layers className="text-purple-400" size={24} />,
      href: "/docs/concepts/workspaces",
      items: ["Isolation", "RBAC", "Venture Discovery"],
    },
    {
      title: "Agent Builder",
      description: "Visual environment for crafting and refining intelligent agents.",
      icon: <Sparkles className="text-cyan-400" size={24} />,
      href: "/docs/agent-builder/visual-config",
      items: ["Tool Registry", "Safety Guardrails", "Output Validation"],
    },
    {
      title: "API Reference",
      description: "Complete OpenAPI specification for all endpoints and webhooks.",
      icon: <Terminal className="text-indigo-400" size={24} />,
      href: "/docs/api/overview",
      items: ["Authentication", "Rate Limits", "Event Types"],
    },
    {
      title: "SDK Guides",
      description: "Idiomatic usage patterns for our TypeScript, Python, and Go SDKs.",
      icon: <Code2 className="text-purple-400" size={24} />,
      href: "/docs/sdk/typescript",
      items: ["Installation", "Authentication", "Usage Examples"],
    },
    {
      title: "Community & Support",
      description: "Troubleshooting, FAQs, and connecting with other developers.",
      icon: <MessageSquare className="text-cyan-400" size={24} />,
      href: "/learn/community",
      items: ["Community Forum", "Discord", "Support Tickets"],
    },
  ];

  return (
    <div className="flex flex-col gap-16 py-12">
      <header className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-fit">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
            Knowledge Base
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-none">
          Build the future, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            faster than ever.
          </span>
        </h1>
        <p className="text-xl text-slate-400 font-light leading-relaxed">
          Everything you need to build, deploy, and scale with Agentflox. Explore
          our guides, API references, and architecture concepts.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, idx) => (
          <Link
            key={idx}
            href={cat.href}
            className="group relative flex flex-col p-8 bg-slate-900/30 border border-slate-800 rounded-3xl hover:border-indigo-500/30 transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="w-14 h-14 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              {cat.icon}
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
              {cat.title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {cat.description}
            </p>

            <ul className="flex flex-col gap-2 mt-auto">
              {cat.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 transition-colors"
                >
                  <div className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-indigo-500/50" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-indigo-400/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
              Explore Guide <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-[2.5rem] flex flex-col items-start gap-4">
          <Github size={32} className="text-white mb-2" />
          <h3 className="text-2xl font-bold text-white">Join the Community</h3>
          <p className="text-slate-400">
            Agentflox is built on open standards and community feedback. Contribute
            to our documentation, share agents, and help us shape the future of
            work.
          </p>
          <Link
            href="https://github.com/agentflox"
            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all mt-4"
          >
            View GitHub Repo <ArrowRight size={16} />
          </Link>
        </div>

        <div className="p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col items-start gap-4 shadow-2xl">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mb-2">
            <Terminal size={24} />
          </div>
          <h3 className="text-2xl font-bold text-white">Interactive CLI</h3>
          <p className="text-slate-400">
            Our command-line tool offers an intuitive way to manage your agents and
            deployments directly from your terminal. Get started with zero
            configuration.
          </p>
          <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm text-green-400 mt-4 overflow-x-auto">
            $ npx agentflox@latest init
          </div>
        </div>
      </div>
    </div>
  );
}

