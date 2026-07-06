"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Sparkles, Box, LayoutTemplate, Briefcase, Zap, Star, Users, UsersRound, Orbit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import ListingCard from "@/features/marketplace/components/ListingCard";

// ─── Rest of the page (unchanged) ──────────────────────────────────────────

export default function ExploreHubView() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/marketplace/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/marketplace/search`);
    }
  };

  const navigateToCategory = (category: string) => {
    router.push(`/marketplace/search?type=${category}`);
  };

  const categories = [
    { id: 'agent', name: 'AI Agents', details: 'Autonomous assistants', icon: <Sparkles className="w-6 h-6" />, color: 'from-blue-600 to-indigo-500' },
    { id: 'tool', name: 'Tools & Scripts', details: 'Modular executions', icon: <Box className="w-6 h-6" />, color: 'from-purple-600 to-pink-500' },
    { id: 'template', name: 'Templates', details: 'Ready-made workflows', icon: <LayoutTemplate className="w-6 h-6" />, color: 'from-emerald-500 to-teal-500' },
    { id: 'workforce', name: 'Workforces', details: 'Swarm intelligence', icon: <Orbit className="w-6 h-6" />, color: 'from-orange-500 to-amber-500' },
    { id: 'talent', name: 'Talents', details: 'Expert humans in the loop', icon: <Users className="w-6 h-6" />, color: 'from-cyan-500 to-sky-500' },
    { id: 'team', name: 'Teams', details: 'Collaborative task forces', icon: <UsersRound className="w-6 h-6" />, color: 'from-rose-500 to-red-500' },
    { id: 'task', name: 'Tasks', details: 'Bounties & open work', icon: <Briefcase className="w-6 h-6" />, color: 'from-gray-600 to-slate-500' },
    { id: 'project', name: 'Projects', details: 'Large scale contracts', icon: <Zap className="w-6 h-6" />, color: 'from-violet-600 to-purple-500' },
  ];

  return (
    <div className="flex flex-col w-full bg-background relative">

      {/* 1. HERO SECTION */}
      <div className="p-4 lg:p-8">
        <div
          className="relative w-full h-full flex items-center overflow-hidden rounded-3xl shadow-xl border border-border/10"
          style={{ background: "linear-gradient(135deg, #05081a 0%, #0d1130 30%, #110a2a 60%, #070e1f 100%)" }}
        >
          <div className="relative z-10 w-full mx-auto py-8 px-8 lg:px-16 flex flex-col lg:flex-row items-center gap-12">

            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 w-full lg:max-w-2xl space-y-6"
            >
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Discover the world's top AI agents with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  Agentflox
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-zinc-300 leading-relaxed font-light">
                The premier workforce network to find bleeding-edge autonomous agents, tools, swarm workforces, and top human talent.
              </p>

              <form onSubmit={handleSearchSubmit} className="relative flex items-center mt-10 mb-2 max-w-xl group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 to-cyan-500/40 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-xl z-0" />
                <div className="relative flex items-center w-full z-10 bg-white border hover:border-zinc-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all rounded-xl shadow-lg overflow-hidden pr-2">
                  <Search className="w-6 h-6 ml-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search for integration or use-case..."
                    className="flex-1 bg-transparent border-0 outline-none px-4 py-4 text-[15px] sm:text-base text-zinc-900 placeholder:text-zinc-500 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" size="lg" className="rounded-lg shadow-md bg-black text-white hover:bg-zinc-800 font-bold h-11 px-6">
                    Explore
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Right: Static Image Network */}
            <div className="flex-1 w-full hidden lg:flex items-center justify-center relative">
              <img src="/images/image_mkp-nobg.png" alt="Marketplace Network" className="w-full h-auto object-contain max-h-[460px] drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 lg:px-8 py-16 w-full z-10 flex flex-col gap-24">

        {/* 2. PREMIUM CATEGORIES GRID */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Box className="w-6 h-6 text-primary" />
                Browse Categories
              </h3>
              <p className="text-muted-foreground mt-1 text-lg">Select a domain to start discovering specialized assets.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigateToCategory(cat.id)}
                className="group relative overflow-hidden cursor-pointer rounded-2xl bg-card border border-border p-6 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`absolute right-0 top-0 w-32 h-32 bg-gradient-to-br ${cat.color} blur-3xl opacity-10 group-hover:opacity-30 transition-opacity rounded-full -mr-10 -mt-10`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <h4 className="text-xl font-bold text-foreground">{cat.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{cat.details}</p>
                <div className="mt-6 flex items-center text-sm font-semibold text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  Explore <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. DYNAMIC DUAL LAYOUT: FEATURED AGENTS + INFO BANNER */}
        <section className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                Featured Agents
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('agent')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="agent" limit={4} />
          </div>

          <div className="w-full lg:w-[400px] shrink-0 bg-gradient-to-b from-blue-600 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
            <div className="relative z-10 w-full h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-3xl font-extrabold mb-4">Need a custom solution built?</h4>
                <p className="text-blue-100 text-lg leading-relaxed">
                  Post a task or project to the marketplace and have the top 1% of talents and teams construct your vision automatically.
                </p>
              </div>
              <Button size="lg" className="w-full mt-8 bg-white text-blue-900 hover:bg-zinc-100 font-bold group" onClick={() => navigateToCategory('task')}>
                Browse Tasks
                <ChevronRight className="ml-2 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
          </div>
        </section>

        {/* 4. OTHER SECTIONS */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Box className="w-6 h-6 text-purple-500" />
              Popular Tools
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('tool')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="tool" limit={4} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Orbit className="w-6 h-6 text-orange-500" />
              Featured Workforces
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('workforce')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="workforce" limit={4} />
        </section>

        <section className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <LayoutTemplate className="w-6 h-6 text-emerald-500" />
                Top Templates
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('template')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="template" limit={4} />
          </div>
        </section>

        <section className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-cyan-500" />
                Leading Talents
              </h3>
              <Button variant="ghost" className="group" onClick={() => navigateToCategory('talent')}>
                View all
                <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
            </div>
            <FeedSection type="talent" limit={4} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-rose-500" />
              Top Teams
            </h3>
            <Button variant="ghost" className="group" onClick={() => navigateToCategory('team')}>
              View all
              <ChevronRight className="ml-1 w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          </div>
          <FeedSection type="team" limit={4} />
        </section>

      </div>
    </div>
  );
}

// ─── Feed helper (unchanged) ────────────────────────────────────────────────
function FeedSection({ type, limit }: { type: string; limit: number }) {
  const { data: listings, isLoading } = trpc.marketplace.searchListings.useQuery({
    type,
    sortBy: "popular",
    limit,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="w-full h-48 rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
        <p>No featured <span className="capitalize">{type}</span>s currently available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing as any} />
      ))}
    </div>
  );
}