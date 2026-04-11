"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Box, Zap, ChevronDown, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ListingCard from "@/features/marketplace/components/ListingCard";
import { Button } from "@/components/ui/button";

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most Downloaded' },
  { value: 'likes', label: 'Most Interact' }
];

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'agent', label: 'AI Agents' },
  { value: 'tool', label: 'Tools & Scripts' },
  { value: 'template', label: 'Templates' },
  { value: 'workforce', label: 'Workforces' },
  { value: 'talent', label: 'Talents' },
  { value: 'team', label: 'Teams' },
  { value: 'task', label: 'Tasks' },
  { value: 'project', label: 'Projects' }
];

export default function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read from URL initially
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('type') || 'all');
  const [pricing, setPricing] = useState(searchParams.get('pricing') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest');
  
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Sync state to URL safely
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === 'all' || value === '') {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      }
      return newSearchParams.toString();
    },
    [searchParams]
  );

  const updateFilters = (updates: Record<string, string | null>) => {
    // Only push if it actually changed
    const qs = createQueryString(updates);
    router.push(`${pathname}?${qs}`, { scroll: false });
  };

  // Sync when URL params change
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setActiveCategory(searchParams.get('type') || 'all');
    setPricing(searchParams.get('pricing') || 'all');
    setSortBy(searchParams.get('sort') || 'latest');
  }, [searchParams]);

  // Derive TRPC constraints
  const isFreeMap = pricing === 'free' ? true : (pricing === 'paid' ? false : undefined);

  // Fetch Data
  const { data: listings, isLoading } = trpc.marketplace.searchListings.useQuery({
    query: query,
    type: activeCategory,
    isFree: isFreeMap,
    sortBy: sortBy as any,
    limit: 50
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] w-full bg-background relative selection:bg-primary/20">
      
      {/* Top Search & Filter Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-wrap gap-4 items-center justify-between">
          
          <div className="flex flex-1 items-center gap-4 min-w-[280px]">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  updateFilters({ q: e.target.value });
                }}
                placeholder="Search assets and opportunities..."
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-transparent focus:bg-background focus:border-primary/50 outline-none rounded-full transition-all"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm font-medium hover:bg-muted transition-colors"
              >
                Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {isSortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute top-full mt-2 right-0 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            updateFilters({ sort: opt.value });
                            setIsSortOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                        >
                          {opt.label}
                          {sortBy === opt.value && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          
        </div>
      </div>

      <div className="flex-1 flex w-full max-w-7xl mx-auto px-6 lg:px-8 py-8 gap-8">
        
        {/* Left Sidebar Filters */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 gap-8 h-fit sticky top-24">
          <div>
            <h4 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Box className="w-4 h-4" /> Category
            </h4>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveCategory(cat.value);
                    updateFilters({ type: cat.value });
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeCategory === cat.value 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Pricing
            </h4>
            <div className="flex bg-muted/50 p-1 rounded-xl">
              {['all', 'free', 'paid'].map(price => (
                <button
                  key={price}
                  onClick={() => {
                     setPricing(price);
                     updateFilters({ pricing: price });
                  }}
                  className={`flex-1 capitalize text-sm py-1.5 rounded-lg transition-all ${
                    pricing === price ? 'bg-background shadow font-medium text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Feed */}
        <main className="flex-1 min-w-0">
          
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-bold">
               {query ? `Search results for "${query}"` : 'All Available Listings'}
             </h2>
             <span className="text-sm text-muted-foreground shadow-sm bg-card px-3 py-1 border border-border rounded-full">
               {isLoading ? '0' : (listings?.length || 0)} results
             </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 h-[260px] animate-pulse flex flex-col justify-between">
                  <div>
                    <div className="h-6 bg-muted rounded-md w-3/4 mb-4" />
                    <div className="h-4 bg-muted rounded-md w-full mb-2" />
                    <div className="h-4 bg-muted rounded-md w-5/6" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-muted rounded-full w-20" />
                    <div className="h-8 bg-muted rounded-full w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-24">
              <AnimatePresence>
                {listings.map((listing, idx) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                  >
                    <ListingCard listing={listing as any} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center border rounded-2xl bg-muted/20 border-dashed">
              <Filter className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                We couldn't find anything matching your filters. Try adjusting your query, category, or pricing options.
              </p>
              <Button 
                variant="outline" 
                className="mt-6 rounded-full"
                onClick={() => {
                  setQuery('');
                  setActiveCategory('all');
                  setPricing('all');
                  router.push(pathname);
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
