"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronDown, ListFilter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import ListingCard from "@/features/marketplace/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recently updated' },
  { id: 'date', label: 'Date created' },
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'clone', label: 'Clone count' },
  { id: 'rating', label: 'Rating' }
];

const TAG_CATEGORIES = [
  {
    name: 'Use Cases',
    tags: [
      'Lead Generation', 'Prospecting', 'Outreach', 'Content Creation', 'Social Media Mgmt', 
      'Competitor Research', 'Market Research', 'Data Enrichment', 'Reporting', 
      'Customer Support', 'CRM Sync', 'Workflow Automation'
    ]
  },
  {
    name: 'Capabilities',
    tags: [
      'AI Video', 'AI Image', 'AI Voice', 'AI Avatar', 'AI Writing', 'Web Scraping', 
      'Data Extraction', 'Document Generation', 'Transcription', 'Translation', 
      'Summarization', 'Scheduling', 'OCR', 'Background Removal'
    ]
  },
  {
    name: 'Platforms',
    tags: [
      'LinkedIn', 'Instagram', 'YouTube', 'TikTok', 'Twitter', 'Facebook', 'HubSpot', 
      'Salesforce', 'Gmail', 'Slack', 'Notion', 'Shopify', 'Google Sheets', 'Google Docs', 
      'Google Drive', 'Google Calendar', 'Airtable', 'Intercom', 'Linear', 'Asana', 
      'Trello', 'Webflow', 'Zapier', 'GitHub', 'Replicate', 'ElevenLabs', 'OpenAI', 'Perplexity'
    ]
  },
  {
    name: 'Industries',
    tags: [
      'Sales', 'Marketing', 'Recruiting', 'E-Commerce', 'Real Estate', 'Agency', 
      'Education', 'Finance'
    ]
  }
];

const LISTING_TYPES = [
  { id: 'agent', label: 'Agents' },
  { id: 'tool', label: 'Tools' },
  { id: 'template', label: 'Templates' },
  { id: 'workforce', label: 'Workforces' },
  { id: 'talent', label: 'Talents' },
  { id: 'team', label: 'Teams' },
  { id: 'task', label: 'Tasks' },
  { id: 'project', label: 'Projects' }
];

const CATEGORIES_MOCK = [
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'content', label: 'Content creation' },
  { id: 'it', label: 'IT & Software Engineering' },
  { id: 'hr', label: 'HR & talent' },
  { id: 'research', label: 'Research' },
  { id: 'customer', label: 'Customer Support' },
  { id: 'product', label: 'Product & Design' },
  { id: 'operations', label: 'Operations' }
];

const PRICE_OPTIONS = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' }
];

export default function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // State initialization from URL
  const parseList = (val: string | null) => val ? val.split(',').filter(Boolean) : [];

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(parseList(searchParams.get('type')));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(parseList(searchParams.get('category')));
  const [selectedPrices, setSelectedPrices] = useState<string[]>(parseList(searchParams.get('price')));
  const [selectedTags, setSelectedTags] = useState<string[]>(parseList(searchParams.get('tag')));
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');
  
  const [openType, setOpenType] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [openPrice, setOpenPrice] = useState(false);
  const [openSort, setOpenSort] = useState(false);
  const [openTags, setOpenTags] = useState(false);

  // Sync state to URL
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedTypes.length) params.set('type', selectedTypes.join(','));
      if (selectedCategories.length) params.set('category', selectedCategories.join(','));
      if (selectedPrices.length) params.set('price', selectedPrices.join(','));
      if (selectedTags.length) params.set('tag', selectedTags.join(','));
      if (sortBy && sortBy !== 'recent') params.set('sort', sortBy);
      
      const qs = params.toString();
      const newPath = qs ? `${pathname}?${qs}` : pathname;
      
      // Update URL without reloading page
      window.history.replaceState(null, '', newPath);
    }, 300); // debounce updates
    
    return () => clearTimeout(timeoutId);
  }, [query, selectedTypes, selectedCategories, selectedPrices, selectedTags, sortBy, pathname]);

  // Derive TRPC constraints for the backend
  const activeType = selectedTypes.length === 1 ? selectedTypes[0] : (searchParams.get('type') || 'all');
  const pricingArg = selectedPrices.includes('free') && !selectedPrices.includes('paid') ? true :
                     selectedPrices.includes('paid') && !selectedPrices.includes('free') ? false : undefined;

  // Fetch Data
  const { data: listings, isLoading } = trpc.marketplace.searchListings.useQuery({
    query: query,
    type: activeType,
    isFree: pricingArg,
    limit: 50
  });

  // Dynamic Button Labels
  const getTypeLabel = () => {
    if (selectedTypes.length === 0) return "All Listings";
    if (selectedTypes.length <= 2) return selectedTypes.map(id => LISTING_TYPES.find(t => t.id === id)?.label).join(', ');
    return `${selectedTypes.length} Selected`;
  };

  const getCategoryLabel = () => {
    if (selectedCategories.length === 0) return "All categories";
    if (selectedCategories.length === 1) return CATEGORIES_MOCK.find(c => c.id === selectedCategories[0])?.label;
    return `${selectedCategories.length} Categories`;
  };

  const getPriceLabel = () => {
    if (selectedPrices.length === 0 || selectedPrices.length === PRICE_OPTIONS.length) return "Free + Paid";
    return PRICE_OPTIONS.find(p => p.id === selectedPrices[0])?.label;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background w-full relative overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 py-10 relative z-10 flex flex-col gap-6">
        
        {/* Top Header */}
        <div className="space-y-6">
          <button 
            onClick={() => router.back()} 
            className="group flex items-center cursor-pointer text-muted-foreground hover:text-foreground transition-all text-sm font-semibold tracking-wide bg-secondary/50 hover:bg-secondary px-5 py-2 rounded-full w-fit backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to Explore
          </button>
          
          <div className="flex flex-col space-y-4 pt-2">
            <h1 className="text-4xl sm:text-[48px] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/70 leading-tight">
              Results for "{query || 'all'}"
            </h1>
            <p className="text-[16px] sm:text-[18px] text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Unleash the power of AI with our diverse range of templates, built by the world's leading AI agencies.
            </p>
          </div>
        </div>

        {/* Filter Controls Sticky Bar */}
        <div className="sticky top-0 z-40 py-4 -mx-6 px-6 lg:-mx-12 lg:px-12 bg-background/60 backdrop-blur-2xl border-b border-border/50 shadow-sm mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Box */}
                <div className="relative group min-w-[200px] w-full sm:w-[300px]">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search listings..."
                      className="w-full pl-10 pr-4 py-2 bg-card/80 backdrop-blur-md border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground shadow-sm"
                    />
                  </div>
                </div>

                {/* By Type */}
                <Popover open={openType} onOpenChange={setOpenType}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-[40px] border-border bg-card/50 backdrop-blur hover:bg-accent hover:text-foreground px-4 rounded-xl font-semibold text-[13px] text-foreground min-w-[130px] justify-between shadow-sm transition-all duration-300">
                      <span className="truncate max-w-[140px]">{getTypeLabel()}</span> <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[200px] p-4 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-foreground">By type</h4>
                      <div className="space-y-3">
                        {LISTING_TYPES.map(t => (
                          <div key={t.id} className="flex items-center space-x-3 group">
                            <Checkbox id={`type-${t.id}`} 
                              checked={selectedTypes.includes(t.id)}
                              onCheckedChange={(c) => setSelectedTypes(prev => c ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                              className="rounded bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all border-muted-foreground/30"
                            />
                            <label htmlFor={`type-${t.id}`} className="text-[14px] font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">{t.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* By Category */}
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-[40px] border-border bg-card/50 backdrop-blur hover:bg-accent hover:text-foreground px-4 rounded-xl font-semibold text-[13px] text-foreground min-w-[140px] justify-between shadow-sm transition-all duration-300">
                      <span className="truncate max-w-[150px]">{getCategoryLabel()}</span> <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[240px] p-0 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl hidden sm:block">
                    <div className="p-4 flex flex-col h-[320px]">
                      <h4 className="font-semibold text-sm mb-4 text-foreground">By category</h4>
                      <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4 pr-2">
                          {CATEGORIES_MOCK.map(c => (
                            <div key={c.id} className="flex items-center space-x-3 group">
                              <Checkbox id={`cat-${c.id}`} 
                                checked={selectedCategories.includes(c.id)}
                                onCheckedChange={(ch) => setSelectedCategories(prev => ch ? [...prev, c.id] : prev.filter(x => x !== c.id))}
                                className="rounded bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all border-muted-foreground/30"
                              />
                              <label htmlFor={`cat-${c.id}`} className="text-[14px] font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">{c.label}</label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* By Price */}
                <Popover open={openPrice} onOpenChange={setOpenPrice}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-[40px] border-border bg-card/50 backdrop-blur hover:bg-accent hover:text-foreground px-4 rounded-xl font-semibold text-[13px] text-foreground min-w-[130px] justify-between shadow-sm transition-all duration-300">
                      <span className="truncate max-w-[120px]">{getPriceLabel()}</span> <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[200px] p-4 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-foreground">By price</h4>
                      <div className="space-y-3">
                        {PRICE_OPTIONS.map(p => (
                          <div key={p.id} className="flex items-center space-x-3 group">
                            <Checkbox id={`price-${p.id}`} 
                              checked={selectedPrices.includes(p.id)}
                              onCheckedChange={(c) => setSelectedPrices(prev => c ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                              className="rounded bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all border-muted-foreground/30"
                            />
                            <label htmlFor={`price-${p.id}`} className="text-[14px] font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">{p.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

              </div>

              {/* Right Side Options */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Sort By */}
                <Popover open={openSort} onOpenChange={setOpenSort}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-[40px] border-border bg-card/50 backdrop-blur hover:bg-accent hover:text-foreground px-4 rounded-xl font-semibold text-[13px] text-foreground min-w-[170px] justify-between shadow-sm transition-all duration-300">
                      <span className="truncate">{SORT_OPTIONS.find(s => s.id === sortBy)?.label || 'Recently updated'}</span>
                      <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[220px] p-1.5 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                    <ScrollArea className="max-h-[280px]">
                      <div className="flex flex-col gap-1">
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => { setSortBy(opt.id); setOpenSort(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-[14px] transition-all flex items-center justify-between ${sortBy === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="icon" className="h-[40px] w-[40px] border-border bg-card/50 backdrop-blur hover:bg-accent hover:text-foreground rounded-xl shrink-0 shadow-sm transition-all duration-300">
                  <ListFilter className="h-4 w-4 text-foreground" />
                </Button>
              </div>
              
            </div>

            <div className="flex">
              <Popover open={openTags} onOpenChange={setOpenTags}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`h-8 rounded-full px-4 text-[12px] font-bold backdrop-blur transition-all duration-300 ${selectedTags.length > 0 ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'bg-card/50 text-muted-foreground border-border hover:bg-accent hover:text-foreground'}`}>
                    + Filter by tag {selectedTags.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px]">{selectedTags.length}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] p-0 rounded-2xl shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                  <div className="p-5 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-sm text-foreground tracking-tight">Filter by tags</h4>
                      {selectedTags.length > 0 && (
                        <button onClick={() => setSelectedTags([])} className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">Clear</button>
                      )}
                    </div>
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                      <div className="space-y-6 pr-2">
                        {TAG_CATEGORIES.map(category => (
                          <div key={category.name} className="space-y-3">
                            <h5 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">{category.name}</h5>
                            <div className="grid grid-cols-1 gap-2.5">
                              {category.tags.map(tag => (
                                <div key={tag} className="flex items-center space-x-3 group">
                                  <Checkbox id={`tag-${tag}`} 
                                    checked={selectedTags.includes(tag)}
                                    onCheckedChange={(c) => setSelectedTags(prev => c ? [...prev, tag] : prev.filter(x => x !== tag))}
                                    className="rounded bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all border-muted-foreground/30"
                                  />
                                  <label htmlFor={`tag-${tag}`} className="text-[13px] font-medium leading-none cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors">{tag}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Content Feed */}
        <main className="w-full pt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 h-[260px] animate-pulse flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="h-6 bg-muted-foreground/10 rounded-lg w-3/4 mb-4" />
                    <div className="h-4 bg-muted-foreground/10 rounded-lg w-full mb-2" />
                    <div className="h-4 bg-muted-foreground/10 rounded-lg w-5/6" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-8 bg-muted-foreground/10 rounded-full w-20" />
                    <div className="h-8 bg-muted-foreground/10 rounded-full w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-24">
              <AnimatePresence>
                {listings.map((listing, idx) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
                  >
                    <ListingCard listing={listing as any} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center border border-border/50 rounded-3xl bg-card/30 backdrop-blur-sm border-dashed mt-8 shadow-sm">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent" />
                <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-foreground">No matches found</h3>
              <p className="text-[15px] text-muted-foreground mt-3 max-w-md font-medium leading-relaxed">
                We couldn't track down any listings perfectly matching your criteria. Try loosening your parameters.
              </p>
              <Button 
                variant="default" 
                className="mt-8 rounded-full shadow-lg font-bold px-8 h-12"
                onClick={() => {
                  setQuery('');
                  setSelectedTypes([]);
                  setSelectedPrices([]);
                  setSelectedCategories([]);
                  setSelectedTags([]);
                }}
              >
                Reset all filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
