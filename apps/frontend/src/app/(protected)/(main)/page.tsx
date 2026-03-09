import Shell from "@/components/layout/Shell";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingBag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <Shell>
      <div className="mx-auto max-w-5xl py-12 px-6">
        {/* Header */}
        <div className="mb-12 flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 pr-4 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-zinc-600">v1.0 is Live</span>
          </div>

          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Welcome to Agentflox
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed">
              The collaborative engine for modern builders. Assemble elite teams, launch high-impact projects, and showcase your work to the world.
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Dashboard Card */}
          <Link href="/dashboard" className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 transition-colors group-hover:bg-zinc-100">
              <LayoutDashboard className="h-6 w-6 text-zinc-600 transition-colors group-hover:text-zinc-900" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-zinc-900">Personal Dashboard</h3>
            <p className="mb-6 text-sm text-zinc-500 leading-relaxed">
              Manage your active workstreams, track team progress, and draft your next big proposal in a focused environment.
            </p>

            <div className="flex items-center text-sm font-medium text-zinc-900 group-hover:underline">
              Launch Workspace
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Marketplace Card */}
          <Link href="/marketplace" className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md">
            <div className="absolute top-6 right-6 flex gap-2">
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-600">
                Trending
              </span>
            </div>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 transition-colors group-hover:bg-zinc-100">
              <ShoppingBag className="h-6 w-6 text-zinc-600 transition-colors group-hover:text-zinc-900" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-zinc-900">Global Marketplace</h3>
            <p className="mb-6 text-sm text-zinc-500 leading-relaxed">
              Discover open opportunities, join existing squads, or source top-tier talent for your next ambitious initiative.
            </p>

            <div className="flex items-center text-sm font-medium text-zinc-900 group-hover:underline">
              Browse Projects
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

        </div>
      </div>
    </Shell>
  );
}
