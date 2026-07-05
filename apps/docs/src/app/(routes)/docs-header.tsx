"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Command, Github, Twitter, Menu, ArrowRight } from "lucide-react";
import { APP_URL } from '@/lib/config';
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#020617]/70 backdrop-blur-2xl transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-8">
          <Link href="/docs" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8">
              <Image
                src="/images/logo.png"
                alt="Agentflox logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                AgentFlox
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-400 -mt-1">
                Documentation
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium">
            <Link href="/docs" className="text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Guides
            </Link>
            <Link
              href="/docs/api/overview"
              className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              API
            </Link>
            <Link
              href="/docs/agent-builder/visual-config"
              className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
              className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:shadow-md focus:bg-white dark:focus:bg-slate-900"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 shadow-sm">
                <Command size={10} />
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-slate-200 dark:border-white/10 pr-5 mr-5 text-slate-500 dark:text-slate-400">
            <ThemeToggle />
            <Link
              href="https://github.com/agentflox"
              className="hover:text-slate-900 dark:hover:text-white hover:scale-110 transition-all"
            >
              <Github size={18} />
            </Link>
            <Link
              href="https://twitter.com/agentflox"
              className="hover:text-slate-900 dark:hover:text-white hover:scale-110 transition-all"
            >
              <Twitter size={18} />
            </Link>
          </div>

          <Link
            href={APP_URL}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white border border-indigo-500/20 hover:border-transparent rounded-full text-sm font-semibold transition-all group shadow-sm hover:shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            Go to Platform
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <button className="md:hidden text-slate-600 dark:text-slate-400">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

