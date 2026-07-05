"use client";

import React from "react";
import Link from "next/link";
import { Terminal, Code2, Layers, Sparkles, Rocket, MessageSquare, ArrowRight, Github, BookOpen } from "lucide-react";

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#020617] text-slate-900 dark:text-slate-200 selection:bg-indigo-500/30 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-50 dark:opacity-20 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
        
        {/* Header Section */}
        <header className="mb-24 relative">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[128px] rounded-full pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm backdrop-blur-sm">
            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold tracking-[0.25em] uppercase text-indigo-700 dark:text-indigo-300">Documentation v2.4</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white mb-8 drop-shadow-sm">
            Technical <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 drop-shadow-xl">
              Intelligence
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium max-w-3xl leading-relaxed">
            Architect enterprise-grade agents with Agentflox. <span className="text-slate-900 dark:text-slate-200">Robust, scalable, and built for mission-critical workflows.</span>
          </p>
        </header>

        {/* Bento Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/60 p-1 shadow-xl shadow-slate-200/20 dark:shadow-none">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              href={cat.href}
              className="group relative bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-md p-8 hover:bg-white dark:hover:bg-[#0F1422] transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 z-10 hover:z-20 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 rounded-2xl m-[1px]"
            >
              <div className="mb-8 p-3 w-fit rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 group-hover:border-indigo-500/50 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-all shadow-sm">
                {React.cloneElement(cat.icon as React.ReactElement, { size: 26, className: "text-indigo-600 dark:text-indigo-400 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" })}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{cat.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{cat.description}</p>
              
              <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                Learn more <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </Link>
          ))}
        </div>

        {/* Enterprise Footer CTA */}
        <section className="mt-32 p-12 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-colors duration-500 shadow-2xl shadow-indigo-500/5">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Need direct enterprise support?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Our solutions architects are ready to help you scale.</p>
            </div>
            <Link href="/contact" className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-semibold rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1">
              Contact Sales <ArrowRight size={16} />
            </Link>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-indigo-500/5 to-transparent mix-blend-overlay" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900/50 to-transparent" />
        </section>
      </div>
    </div>
  );
}