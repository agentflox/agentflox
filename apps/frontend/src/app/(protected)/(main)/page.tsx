import Shell from "@/components/layout/Shell";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingBag, Sparkles, PlayCircle, BookOpen, ExternalLink, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <Shell>
      <div className="bg-gradient-to-br from-background via-background to-muted/20 pb-24 min-h-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-0 lg:pt-2 flex flex-col gap-6">
          
          {/* Header Banner */}
          <div className="shrink-0 relative overflow-hidden rounded-3xl border border-border bg-card p-6 lg:p-10 shadow-sm">
            <div className="absolute right-0 top-0 -translate-y-12 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute z-0 inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-5 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-md px-3 py-1.5 shadow-sm self-start">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold tracking-wide">v1.0 is Live</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex flex-wrap items-center gap-3">
                Welcome to Agentflox
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-[pulse_3s_ease-in-out_infinite]" />
              </h1>
              
              <p className="text-muted-foreground text-base sm:text-lg font-medium leading-relaxed max-w-2xl">
                The collaborative engine for modern builders. Assemble elite AI workforces, launch high-impact projects, and orchestrate the future of work.
              </p>
            </div>
          </div>

          {/* Core Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Dashboard Card */}
            <Link href="/dashboard" className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-10 transition-all duration-300 hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1">
              <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-full -mr-20 -mt-20" />
              
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg text-white group-hover:scale-110 transition-transform duration-300">
                  <LayoutDashboard className="h-7 w-7" />
                </div>

                <h3 className="mb-3 text-2xl font-bold text-foreground">Personal Dashboard</h3>
                <p className="mb-8 text-muted-foreground text-base leading-relaxed">
                  Manage your active workstreams, track autonomous team progress, and draft your next big orchestration in a focused, powerful environment.
                </p>

                <div className="flex items-center font-semibold text-blue-600 dark:text-blue-400">
                  Launch Workspace 
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </div>
              </div>
            </Link>

            {/* Marketplace Card */}
            <Link href="/marketplace" className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 lg:p-10 transition-all duration-300 hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1">
              <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-full -mr-20 -mt-20" />
              
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg text-white group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="h-7 w-7" />
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-2xl font-bold text-foreground">Global Marketplace</h3>
                  <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                    Trending
                  </span>
                </div>
                <p className="mb-8 text-muted-foreground text-base leading-relaxed">
                  Discover top-tier AI agents, join existing squads, or source expert human talent for your next ambitious initiative.
                </p>

                <div className="flex items-center font-semibold text-purple-600 dark:text-purple-400">
                  Browse Hub
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </div>
              </div>
            </Link>
          </div>

          {/* Getting Started & Tutorials Section */}
          <div className="mt-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
                  <PlayCircle className="w-7 h-7 text-primary" />
                  Get Started
                </h2>
                <p className="text-muted-foreground mt-1 text-lg">Learn the basics and accelerate your workflow with our tutorials.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Deploying Your First AI Agent', duration: '5:24' },
                { title: 'Orchestrating a Swarm Workforce', duration: '8:15' },
                { title: 'Publishing to the Marketplace', duration: '4:42' },
              ].map((vid, idx) => (
                <div key={idx} className="group cursor-pointer flex flex-col gap-3">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted border border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-black text-white transition-all duration-300 shadow-xl">
                        <PlayCircle className="w-6 h-6 ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-md">
                      {vid.duration}
                    </div>
                  </div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{vid.title}</h4>
                </div>
              ))}
            </div>

            {/* Complete Docs CTA Banner */}
            <a 
              href="https://docs.agentflox.com" 
              target="_blank" 
              rel="noreferrer"
              className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden rounded-3xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg group"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Documentation & Guides</h3>
                  <p className="text-muted-foreground mt-1">Deep dive into API references, advanced workflows, and best practices.</p>
                </div>
              </div>
              <div className="shrink-0 flex items-center justify-center rounded-xl bg-black px-6 py-3 font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 gap-2">
                View Docs <ExternalLink className="h-4 w-4" />
              </div>
            </a>
          </div>

        </div>
      </div>
    </Shell>
  );
}
