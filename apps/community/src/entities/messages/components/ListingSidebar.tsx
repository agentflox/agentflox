'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Loader2, Store, Tag, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ListingSidebar({ listingId }: { listingId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: listing, isLoading } = trpc.marketplace.get.useQuery(
    { id: listingId },
    { enabled: !!listingId }
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col p-6 items-center justify-center text-muted-foreground bg-zinc-50/30 dark:bg-zinc-900/10">
        <Loader2 className="h-6 w-6 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading listing details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex h-full w-full flex-col p-6 items-center justify-center text-muted-foreground bg-zinc-50/30 dark:bg-zinc-900/10">
        <Store className="h-8 w-8 mb-4 opacity-50" />
        <p className="text-sm font-medium">Listing not found</p>
      </div>
    );
  }

  const isAsset = ['agent', 'tool', 'template', 'workforce'].includes(listing.type);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-zinc-50/30 dark:bg-zinc-900/10 custom-scrollbar">
      <div className="p-6 flex flex-col gap-6 relative z-10">
        {/* Title & Price */}
        <div>
          <h2 className="text-xl font-bold leading-tight mb-3 text-foreground">{listing.title}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400 tracking-tight">
              {(listing as any).isFree ? 'Free' : (
                isAsset ? 
                  ((listing as any).priceCredits ? `⚡${(listing as any).priceCredits}` : 'Premium') : 
                  ((listing as any).pricingModel === 'range' ? `$${(listing as any).priceMin} - $${(listing as any).priceMax}` : 
                  ((listing as any).price ? `$${(listing as any).price}` : 'Premium'))
              )}
            </span>
          </div>
          
          {/* Description */}
          {listing.description && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="relative">
                <div 
                  className={cn(
                    "text-sm text-muted-foreground bg-white/60 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm transition-[max-height] duration-500 ease-in-out overflow-hidden prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-p:my-2 prose-headings:my-2 prose-headings:font-semibold max-w-none",
                    isExpanded ? "max-h-[2000px]" : "max-h-[320px]"
                  )}
                  dangerouslySetInnerHTML={{ __html: listing.description }} 
                />
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f6f6f7] dark:from-[#131315] to-transparent pointer-events-none rounded-b-xl" />
                )}
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 self-start ml-1 mt-1 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Read more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button asChild className="w-full shadow-sm group">
          <Link href={`/marketplace/listing/${listing.id}`}>
            View Full Listing
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>

        {/* Creator */}
        <div className="pt-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Creator</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
            <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
              <AvatarFallback className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-semibold">
                {listing.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate text-foreground">{listing.author.name}</span>
              <Link href={`/profiles/${listing.author.id}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                View Profile
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
