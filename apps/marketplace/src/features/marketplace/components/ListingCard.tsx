"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MarketplaceListing } from "../types/marketplace.types";
import { trpc } from "@/lib/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, Download, CheckCircle2, Star, Zap, HardDriveDownload, GitFork, Lock, Unlock, Clock, ImageIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplyToListingModal } from "./ApplyToListingModal";

interface ListingCardProps {
  listing: MarketplaceListing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { data: session } = useSession();
  const isOwnListing = session?.user?.id === listing.author.id;
  const { data: existingApplication } = trpc.marketplace.myApplicationForListing.useQuery(
    { listingId: listing.id },
    { enabled: !!session?.user?.id && !isOwnListing && !['agent', 'tool', 'template', 'workforce'].includes(listing.type), staleTime: 30_000 }
  );


  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'installed'>('idle');
  const [progress, setProgress] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);

  const isAsset = ['agent', 'tool', 'template', 'workforce'].includes(listing.type);
  const isOpportunity = ['task', 'team', 'project', 'talent'].includes(listing.type);

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    setDownloadState('downloading');
    setProgress(0);

    // Simulate progress bar 0-100% over 1.8s
    const start = Date.now();
    const duration = 1800;

    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed > duration) {
        setProgress(100);
        setTimeout(() => setDownloadState('installed'), 200);
      } else {
        setProgress(Math.floor((elapsed / duration) * 100));
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  };

  return (
    <>
      <div
        className="group relative flex flex-col bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden h-full"
        style={{ viewTransitionName: `listing-${listing.id}` } as React.CSSProperties}
      >

        {/* Cover Image Area */}
        {(listing as any).thumbnail || (listing as any).coverImage ? (
          <div className="w-full h-40 overflow-hidden relative border-b border-border/50 shrink-0">
            <img src={(listing as any).thumbnail || (listing as any).coverImage} alt={listing.title} className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />

            <Badge variant="outline" className="absolute top-3 right-3 capitalize text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5 border-none bg-background/90 text-foreground backdrop-blur-md shadow-sm">
              {(listing as any).isFree ? 'Free' : 'Paid'}
            </Badge>

            <div className="absolute bottom-3 left-4 flex gap-2">
              <Badge variant="secondary" className="capitalize text-[10px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border-zinc-200/50 bg-background/80 backdrop-blur-md shadow-sm">
                {listing.type}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="w-full h-40 overflow-hidden relative border-b border-border/50 shrink-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px', color: 'var(--primary)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent/10" />
            <ImageIcon className="w-10 h-10 text-primary/20 absolute right-6 bottom-4 drop-shadow-sm" />

            <Badge variant="outline" className="absolute top-3 right-3 capitalize text-[10px] font-bold tracking-wider rounded-full px-2.5 py-0.5 border-none bg-background/90 text-foreground backdrop-blur-md shadow-sm">
              {(listing as any).isFree ? 'Free' : 'Paid'}
            </Badge>

            <div className="absolute bottom-3 left-4 flex gap-2">
              <Badge variant="secondary" className="capitalize text-[10px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border-zinc-200 dark:border-zinc-800 bg-background/80 backdrop-blur-md shadow-sm">
                {listing.type}
              </Badge>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-5 pt-4 pb-0 flex-1 flex flex-col">

          {/* Badges row (status) */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {listing.assetState === 'locked' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                <Lock className="h-2.5 w-2.5" /> Locked
              </span>
            )}
            {listing.assetState === 'ejected' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-200">
                <Unlock className="h-2.5 w-2.5" /> Ejected
              </span>
            )}
            {listing.assetState === 'outdated' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase bg-red-50 text-red-500 px-2 py-0.5 rounded-md border border-red-200">
                Update available
              </span>
            )}
          </div>

          {/* Title & Price */}
          <div className="flex justify-between items-start gap-3 mb-2">
            <a href={`/marketplace/listing/${listing.id}`} className="group/title block flex-1 min-w-0">
              <h3 className="text-base sm:text-[17px] font-bold leading-snug text-foreground line-clamp-2 group-hover/title:text-primary group-hover/title:underline decoration-primary/50 underline-offset-4 transition-all tracking-tight cursor-pointer">
                {listing.title}
              </h3>
            </a>

            {/* Pricing Stack */}
            <div className="shrink-0 flex items-start gap-1.5 mt-0.5">
              <Tag className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-sky-700 dark:text-sky-500 leading-none tracking-tight">
                  {(listing as any).isFree ? 'No fee' : (
                    isAsset ?
                      ((listing as any).priceCredits ? `⚡${(listing as any).priceCredits}` : 'Premium') :
                      ((listing as any).pricingModel === 'range' ? `$${(listing as any).priceMin} - $${(listing as any).priceMax}` :
                        ((listing as any).price ? `$${(listing as any).price}` : 'Premium'))
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground capitalize mt-1.5 leading-none font-medium">
                  {(listing as any).pricingModel === 'hourly' ? 'Hourly' : ((listing as any).pricingModel === 'range' ? 'Range' : 'Fixed-price')}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Stack */}
          <div className="flex flex-col gap-1">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full overflow-hidden border border-border bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0 shadow-sm">
                {(listing.author as any).avatar ? (
                  <img src={(listing.author as any).avatar} alt={listing.author.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-muted-foreground">{listing.author.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <a href={`/profiles/${listing.author.id}`} className="font-semibold text-xs text-muted-foreground hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4">
                {listing.author.name}
              </a>
              {listing.author.verified && <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-50/50 -ml-0.5" />}
            </div>

            {/* Time */}
            <div className="flex items-center">
              <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Posted {new Date((listing as any).updatedAt || (listing as any).createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 flex-1">
            {/<[a-z][\s\S]*>/i.test(listing.description) ? (
              <div
                className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed preview-html font-medium custom-prose-sm"
                dangerouslySetInnerHTML={{ __html: listing.description }}
              />
            ) : (
              <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                {listing.description}
              </p>
            )}
          </div>

          {/* Metrics (Ratings, Installs) */}
          <div className="flex items-center gap-3 mt-5 pb-4 text-xs font-bold text-muted-foreground border-t border-border/50 pt-4">
            {(isAsset || listing.ratings) && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                <Star className="h-3.5 w-3.5 fill-amber-500" />
                <span>{(listing.ratings?.average || 0).toFixed(1)} <span className="text-[10px] text-amber-600/60 ml-0.5">({listing.ratings?.totalReviews || 0})</span></span>
              </div>
            )}
            {listing.commentCount > 0 && (
              <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" /> {listing.commentCount}
                <span className="hidden sm:inline font-medium">comments</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 ml-auto text-primary/70 shrink-0">
              <HardDriveDownload className="h-3.5 w-3.5" />
              {listing.downloadCount?.toLocaleString() || 0}
              <span className="hidden sm:inline font-medium">{isOpportunity ? 'applied' : (listing.type === 'template' ? 'cloned' : 'installed')}</span>
            </span>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="px-5 py-4 bg-muted/20 border-t border-border flex items-center justify-end gap-4 shrink-0">


          <div className="flex items-center gap-2">
            {isAsset ? (
              <>
                {listing.type === 'template' && (
                  <Button variant="outline" size="sm" className="h-9 shadow-sm hidden sm:flex rounded-full px-4 font-bold hover:bg-muted transition-all">
                    <GitFork className="h-4 w-4 mr-1.5 text-muted-foreground" /> Fork
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={downloadState === 'installed' ? 'secondary' : 'primary'}
                  onClick={handleDownload}
                  disabled={downloadState === 'downloading'}
                  className={cn(
                    "h-9 relative overflow-hidden transition-all w-28 rounded-full font-bold shadow-md hover:shadow-primary/30",
                    downloadState === 'installed' ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 hover:shadow-sm" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {downloadState === 'idle' && (
                    <span className="flex items-center gap-1.5"><Download className="h-4 w-4" /> Install</span>
                  )}
                  {downloadState === 'downloading' && (
                    <>
                      <div className="absolute inset-0 bg-primary/20" />
                      <div className="absolute inset-y-0 left-0 bg-primary opacity-20 transition-all duration-75" style={{ width: `${progress}%` }} />
                      <span className="relative text-xs">{progress}%</span>
                    </>
                  )}
                  {downloadState === 'installed' && (
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Launch</span>
                  )}
                </Button>
              </>
            ) : existingApplication ? (
              <Button size="sm" className="h-9 rounded-full px-5 font-bold shadow-sm" variant="secondary" disabled>
                Applied
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 rounded-full px-5 font-bold transition-all duration-300 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 group relative overflow-hidden bg-primary text-primary-foreground border-none"
                asChild
              >
                <a href={`/marketplace/listing/${listing.id}`}>
                  <span className="relative z-10">{isOwnListing ? 'Your Listing' : 'View Details'}</span>
                  <div className="absolute inset-0 h-full w-[200%] -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
      <ApplyToListingModal listing={listing} open={applyOpen} onOpenChange={setApplyOpen} />
    </>
  );
}
