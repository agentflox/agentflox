"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Command, Github, Twitter, Menu, ArrowRight } from "lucide-react";

export const DocsHeader = () => {
  const [searchValue, setSearchValue] = useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto flex h-16 items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-8">
          <Link href="/docs" className="flex items-center gap-2 group">
            <div className="w-8 h-8 flex items-center justify-center bg-indigo-500 rounded-sm">
              <span className="text-xl font-bold tracking-tighter text-white">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                Agentflox
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-400 -mt-1">
                Documentation
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium">
            <Link href="/docs" className="text-slate-200 hover:text-white transition-colors">
              Guides
            </Link>
            <Link
              href="/docs/api/overview"
              className="text-slate-400 hover:text-white transition-colors"
            >
              API
            </Link>
            <Link
              href="/docs/agent-builder/visual-config"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Agent Builder
            </Link>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Search size={18} />
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search documentation..."
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg py-2 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-500"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[10px] font-mono text-slate-400">
                <Command size={10} />
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-white/10 pr-4 mr-4 text-slate-400">
            <Link
              href="https://github.com/agentflox"
              className="hover:text-white transition-colors"
            >
              <Github size={20} />
            </Link>
            <Link
              href="https://twitter.com/agentflox"
              className="hover:text-white transition-colors"
            >
              <Twitter size={20} />
            </Link>
          </div>

          <Link
            href="https://app.agentflox.com"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-sm font-medium text-indigo-400 transition-all group"
          >
            Go to Platform
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <button className="md:hidden text-slate-400">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

