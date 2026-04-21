"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MarketplaceListing } from "../types/marketplace.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Share2, BookmarkPlus, BookmarkCheck, Paperclip,
  Download, CheckCircle2, Star, Users, Clock, Globe, Lock, Unlock, FileImage, Tag, Layers
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CommentSection } from "@/entities/comments/components/CommentSection";
import { useComments } from "@/entities/comments/hooks/useComments";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";

interface ListingDetailViewProps {
  listing: MarketplaceListing;
}

export default function ListingDetailView({ listing }: ListingDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const { comments } = useComments(listing.id, 'listing');
  const isOwnListing = session?.user?.id === listing.author.id;
  const { data: existingApplication } = trpc.marketplace.myApplicationForListing.useQuery(
    { listingId: listing.id },
    {
      enabled:
        !!session?.user?.id &&
        !isOwnListing &&
        !['agent', 'tool', 'template', 'workforce'].includes(listing.type),
      staleTime: 30_000,
    }
  );
  const [isSaved, setIsSaved] = useState(listing.isSaved || false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'installed'>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const rateListingMutation = trpc.marketplace.rateListing.useMutation();
  const attachmentUrls = listing.attachmentUrls ?? [];
  const isAsset = ['agent', 'tool', 'template', 'workforce'].includes(listing.type);
  const isOpportunity = !isAsset;

  const handleDownload = () => {
    if (downloadState !== 'idle') return;
    setDownloadState('downloading');
    setProgress(0);
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
        className="bg-background text-foreground pb-24"
        style={{ viewTransitionName: `listing-${listing.id}` } as React.CSSProperties}
      >
        {/* Sticky Top Nav */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push('/marketplace')} className="-ml-2 gap-1.5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Marketplace
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSaved(!isSaved)}>
                {isSaved
                  ? <BookmarkCheck className="h-4 w-4 text-amber-500" />
                  : <BookmarkPlus className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copied!",
                    description: "Listing URL copied to clipboard."
                  });
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-10 space-y-12">

          {/* ── Hero Section ── */}
          <section className="space-y-5">
            {listing.coverImage && (
              <div className="overflow-hidden rounded-2xl border border-border">
                <img src={listing.coverImage} alt={listing.title} className="h-56 w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize rounded-full text-xs border-zinc-200 dark:border-zinc-800">
                {listing.type}
              </Badge>
              {/* Removed version as per request */}
              {listing.assetState === 'locked' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                  <Lock className="h-2.5 w-2.5" /> Locked
                </span>
              )}
              {listing.assetState === 'ejected' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-200">
                  <Unlock className="h-2.5 w-2.5" /> Ejected
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-1">
                Posted {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              {listing.title}
            </h1>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <Link href={`/profiles/${listing.author.id}`} className="flex items-center gap-2.5 group cursor-pointer inline-flex">
                  <Avatar className="h-8 w-8 transition-transform group-hover:scale-105">
                    <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200 transition-colors">
                      {listing.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium text-sm group-hover:underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-600 transition-all text-foreground">{listing.author.name}</span>
                    {(listing.author.isVerified || listing.author.verified) && (
                      <span className="ml-1.5 bg-blue-500/10 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />Verified
                      </span>
                    )}
                  </div>
                </Link>
              </div>
              {listing.isRemote && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Remote
                </span>
              )}
            </div>
          </section>

          {/* ── CTA Action Bar ── */}
          <section className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1 flex flex-col justify-center">
              <div className="shrink-0 flex items-start gap-2.5">
                <Tag className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mt-1" />
                <div className="flex flex-col">
                  <span className="text-[28px] font-black text-sky-700 dark:text-sky-500 leading-none tracking-tight">
                    {(listing as any).isFree ? 'No fee' : (
                      isAsset ?
                        ((listing as any).priceCredits ? `⚡${(listing as any).priceCredits}` : 'Premium') :
                        ((listing as any).pricingModel === 'range' ? `$${(listing as any).priceMin} - $${(listing as any).priceMax}` :
                          ((listing as any).price ? `$${(listing as any).price}` : 'Premium'))
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize mt-2 leading-none font-medium">
                    {(listing as any).pricingModel === 'hourly' ? 'Hourly rate' : ((listing as any).pricingModel === 'range' ? 'Budget range' : 'Fixed-price')}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-[30px]">
                {isAsset && listing.downloadCount !== undefined && (
                  <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md">
                    <Download className="h-3.5 w-3.5" /> {listing.downloadCount.toLocaleString()} installs
                  </span>
                )}
                {!isAsset && (listing as any).applyCount !== undefined && (
                  <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md">
                    <Users className="h-3.5 w-3.5" /> {(listing as any).applyCount} applicants
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {/* Like button removed */}

              {isAsset ? (
                <Button
                  className={cn(
                    "h-11 px-7 text-sm font-semibold relative overflow-hidden transition-all min-w-[140px]",
                    downloadState === 'installed' && "bg-emerald-500 hover:bg-emerald-600"
                  )}
                  onClick={handleDownload}
                  disabled={downloadState === 'downloading'}
                >
                  {downloadState === 'idle' && (
                    <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Install Now</span>
                  )}
                  {downloadState === 'downloading' && (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-75" style={{ width: `${progress}%` }} />
                      <span className="relative">{progress}%</span>
                    </>
                  )}
                  {downloadState === 'installed' && (
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Launch</span>
                  )}
                </Button>
              ) : existingApplication ? (
                <Button className="h-11 px-7 text-sm font-semibold gap-2" variant="secondary" disabled>
                  Already applied
                </Button>
              ) : (
                <Button
                  className="h-11 px-7 text-sm font-semibold gap-2"
                  onClick={() => router.push(`/marketplace/listing/${listing.id}/apply`)}
                  disabled={isOwnListing}
                >
                  {isOwnListing
                    ? "Your listing"
                    : ['talent', 'team'].includes(listing.type)
                      ? 'Connect'
                      : 'Apply Now'}
                </Button>
              )}
            </div>
          </section>

          {/* ── Content Grid ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">About this {listing.type}</h2>
                <div
                  className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{ __html: listing.description || "" }}
                />
              </div>

              {attachmentUrls.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                    <Paperclip className="h-3.5 w-3.5" /> Attached files
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {attachmentUrls.map((url, index) => {
                      const fileName = decodeURIComponent(url.split('/').pop() || `Attachment_${index + 1}`);
                      return (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          download={fileName}
                          className="w-fit text-[14px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:underline underline-offset-4 transition-colors flex items-center gap-1.5 group px-1"
                        >
                          <Download className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                          {fileName}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Discussion */}
              <div className="pt-8 border-t border-border">
                <h2 className="text-2xl font-semibold mb-6">Discussion ({comments?.length || 0})</h2>
                <CommentSection postId={listing.id} entityType="listing" />
              </div>
            </div>

            {/* Sidebar column */}
            <div className="space-y-6">
              {/* Ratings (Assets) */}
              {listing.ratings && (
                <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                  <h3 className="font-semibold text-sm">Ratings</h3>
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <span className="text-4xl font-bold bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
                      {listing.ratings.average.toFixed(1)}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("h-3.5 w-3.5", i < Math.round(listing.ratings!.average) ? "text-amber-400 fill-amber-400" : "text-zinc-300")} />
                        ))}
                      </div>
                      {listing.ratings.totalReviews} reviews
                    </div>
                  </div>
                  {/* Rating metrics removed as per requested */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Rate this listing</p>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const value = i + 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={async () => {
                              setSelectedRating(value);
                              await rateListingMutation.mutateAsync({ listingId: listing.id, rating: value });
                            }}
                            className="p-1"
                          >
                            <Star className={cn("h-4 w-4", value <= (selectedRating || Math.round(listing.ratings!.average)) ? "text-amber-400 fill-amber-400" : "text-zinc-300")} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-zinc-400" /> Category
                </h3>
                {listing.categories && listing.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {listing.categories.map(s => (
                      <Badge key={s} variant="outline" className="bg-muted/50 font-normal text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 italic blur-[0.4px] select-none">No category specified</p>
                )}
              </div>

              {/* Tags */}
              <div className="p-5 rounded-2xl border border-border bg-card">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Tag className="h-4 w-4 text-zinc-400" /> Tags</h3>
                {listing.tags && listing.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {listing.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="font-medium text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 italic blur-[0.4px] select-none">No tags provided</p>
                )}
              </div>

              {/* Location / Remote (Opportunities) */}
              {isOpportunity && listing.location && (
                <div className="p-5 rounded-2xl border border-border bg-card">
                  <h3 className="font-semibold text-sm mb-2">Location</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {listing.isRemote ? 'Remote — ' : ''}{listing.location}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

    </>
  );
}
