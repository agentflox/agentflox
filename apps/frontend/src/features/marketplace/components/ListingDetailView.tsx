"use client";

import { useState } from "react";
import { MarketplaceListing } from "../types/marketplace.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, Share2, BookmarkPlus, Heart, BookmarkCheck,
  Download, CheckCircle2, Star, Users, Clock, Globe, Lock, Unlock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CommentSection } from "@/entities/comments/components/CommentSection";
import { ApplyToListingModal } from "./ApplyToListingModal";
import { cn } from "@/lib/utils";

interface ListingDetailViewProps {
  listing: MarketplaceListing;
}

export default function ListingDetailView({ listing }: ListingDetailViewProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(listing.isSaved || false);
  const [isLiked, setIsLiked] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'installed'>('idle');
  const [progress, setProgress] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);

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
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSaved(!isSaved)}>
              {isSaved
                ? <BookmarkCheck className="h-4 w-4 text-amber-500" />
                : <BookmarkPlus className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 space-y-12">

        {/* ── Hero Section ── */}
        <section className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize rounded-full text-xs border-zinc-200 dark:border-zinc-800">
              {listing.type}
            </Badge>
            {listing.version && (
              <span className="text-xs font-mono text-muted-foreground">v{listing.version}</span>
            )}
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
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {listing.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium text-sm">{listing.author.name}</span>
                {listing.author.verified && (
                  <span className="ml-1.5 bg-blue-500/10 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" />Verified
                  </span>
                )}
              </div>
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
          <div className="space-y-1">
            {isAsset ? (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Price</p>
                <p className="text-2xl font-bold">
                  {listing.isFree ? 'Free' : listing.priceCredits ? `${listing.priceCredits} Credits` : 'Free'}
                </p>
                {listing.downloadCount !== undefined && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Download className="h-3 w-3" /> {listing.downloadCount.toLocaleString()} installs
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Budget</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {listing.budget
                    ? (typeof listing.budget === 'string'
                        ? listing.budget
                        : `${listing.budget.currency} ${listing.budget.min.toLocaleString()} – ${listing.budget.max.toLocaleString()}`)
                    : 'Open Budget'}
                </p>
                {listing.applyCount !== undefined && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {listing.applyCount} applicants
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsLiked(!isLiked)}
              className={cn("gap-2 h-11 px-5", isLiked && 'text-rose-500 border-rose-500/50 bg-rose-500/10')}
            >
              <Heart className={cn("w-4 h-4", isLiked && 'fill-rose-500')} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>

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
            ) : (
              <Button
                className="h-11 px-7 text-sm font-semibold gap-2"
                onClick={() => setApplyOpen(true)}
              >
                {['talent', 'team'].includes(listing.type) ? 'Connect' : 'Apply Now'}
              </Button>
            )}
          </div>
        </section>

        {/* ── Content Grid ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="text-2xl font-semibold mb-4">About this {listing.type}</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-sm">
                <p>{listing.description}</p>
              </div>
            </div>

            {/* Discussion */}
            <div className="pt-8 border-t border-border">
              <h2 className="text-2xl font-semibold mb-6">Discussion ({listing.commentCount})</h2>
              <CommentSection entityId={listing.id} entityType="marketplace" />
            </div>
          </div>

          {/* Sidebar column */}
          <div className="space-y-6">
            {/* Skills */}
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-semibold text-sm mb-3">
                {isAsset ? 'Tags & Technologies' : 'Required Skills'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {listing.skills.map(s => (
                  <Badge key={s} variant="outline" className="bg-muted/50 font-normal text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
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
                <div className="space-y-2.5 text-sm">
                  {(['quality', 'communication', 'delivery'] as const).map(key => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-muted-foreground capitalize">{key}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${(listing.ratings![key] / 5) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-xs">{listing.ratings![key].toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>

    <ApplyToListingModal listing={listing} open={applyOpen} onOpenChange={setApplyOpen} />
    </>
  );
}
