"use client";

import { Input } from "@/components/ui/input";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import { MarketplaceSearchIntent, ListingType } from "../types/marketplace.types";
import { Badge } from "@/components/ui/badge";

interface MarketplaceSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  intent: MarketplaceSearchIntent | null;
  isParsing: boolean;
}

export default function MarketplaceSearch({
  query,
  onQueryChange,
  intent,
  isParsing
}: MarketplaceSearchProps) {

  const clearQuery = () => onQueryChange('');

  const hasInferredState = query.length > 2 && intent && (intent.inferredCategory || intent.inferredSkills.length > 0 || intent.inferredDuration);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3" style={{ viewTransitionName: 'search-bar' } as React.CSSProperties}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          {isParsing ? (
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          )}
        </div>
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="What do you need? e.g. 'Looking for a React expert for 3 weeks' or 'CRM agent template'"
          className="pl-12 pr-12 h-14 text-base md:text-lg rounded-2xl border-zinc-200/60 dark:border-zinc-800 focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 shadow-sm transition-all"
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {hasInferredState && (
        <div className="flex flex-wrap items-center gap-2 pl-2 animate-in slide-in-from-top-2 fade-in duration-300">
          <Sparkles className="h-4 w-4 text-amber-500 mr-1" />
          <span className="text-sm font-medium text-muted-foreground">AI filter detected:</span>
          
          {intent?.inferredCategory && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 capitalize font-medium">
              {intent.inferredCategory}
            </Badge>
          )}
          
          {intent?.inferredSkills.map(skill => (
            <Badge key={skill} variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 font-medium">
              {skill}
            </Badge>
          ))}
          
          {intent?.inferredDuration && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-medium">
              {intent.inferredDuration}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
