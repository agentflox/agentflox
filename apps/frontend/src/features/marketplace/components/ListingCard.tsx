"use client";

import { useState } from "react";
import { MarketplaceListing } from "../types/marketplace.types";
import { useMatchScore } from "../hooks/useMatchScore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Download, CheckCircle2, Star, Zap, HardDriveDownload, GitFork, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApplyToListingModal } from "./ApplyToListingModal";

interface ListingCardProps {
  listing: MarketplaceListing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  // Mocking profile for deterministic scoring
  const mockProfile = { skills: ["React", "TypeScript"] };
  const match = useMatchScore(listing, mockProfile);
  
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
      className="group relative flex flex-col bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
      style={{ viewTransitionName: `listing-${listing.id}` } as React.CSSProperties}
    >
      
      {/* Top Banner Area (Optional context per type) */}
      <div className="px-6 pt-6 pb-4 flex justify-between items-start gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="capitalize text-xs rounded-full px-2 py-0.5 border-zinc-200 dark:border-zinc-800">
               {listing.type}
            </Badge>
            {listing.version && (
               <span className="text-xs text-muted-foreground font-mono">v{listing.version}</span>
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
            {listing.assetState === 'outdated' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full border border-red-200">
                Update available
              </span>
            )}
          </div>
          <a href={`/marketplace/listing/${listing.id}`} className="block">
            <h3 className="text-xl font-semibold leading-tight text-foreground truncate group-hover:text-amber-600 transition-colors cursor-pointer">
              {listing.title}
            </h3>
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{listing.author.name}</span>
            {listing.author.verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 fill-blue-50" />}
          </div>
        </div>
        
        {/* Match Percentage (Opportunities) or Ratings (Assets) */}
        {isOpportunity && (
          <div className="relative group/match shrink-0 flex items-center justify-center h-12 w-12 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-sm">
             {match.score}%
             
             {/* Match Details tooltip on hover */}
             <div className="absolute top-14 right-0 w-64 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 p-4 rounded-xl shadow-xl opacity-0 invisible group-hover/match:opacity-100 group-hover/match:visible transition-all z-10 translate-y-2 group-hover/match:translate-y-0 text-sm font-normal">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-700 dark:border-zinc-300">
                   <Zap className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
                   <span className="font-semibold">Match Breakdown</span>
                </div>
                <ul className="space-y-2">
                   <li className="flex justify-between">
                     <span className="text-zinc-400 dark:text-zinc-500">Skills overlap:</span>
                     <span className="font-medium">{match.factors.skillsMatch}/{match.factors.skillsTotal}</span>
                   </li>
                   {match.factors.budgetFits !== undefined && (
                     <li className="flex justify-between">
                       <span className="text-zinc-400 dark:text-zinc-500">Budget criteria:</span>
                       <span className="font-medium">{match.factors.budgetFits ? 'Fits' : 'Mismatch'}</span>
                     </li>
                   )}
                   <li className="flex justify-between">
                     <span className="text-zinc-400 dark:text-zinc-500">Remote possible:</span>
                     <span className="font-medium">✓ Fit</span>
                   </li>
                </ul>
             </div>
          </div>
        )}

        {isAsset && listing.ratings && (
          <div className="shrink-0 flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full text-sm font-medium border border-amber-500/20">
            <Star className="h-3.5 w-3.5 fill-amber-500" />
            {listing.ratings.average.toFixed(1)}
          </div>
        )}
      </div>

      <div className="px-6 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
           {listing.description}
        </p>
        
        {/* Skills/Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {listing.skills.slice(0, 4).map(skill => (
            <span key={skill} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted/50">
              {skill}
            </span>
          ))}
          {listing.skills.length > 4 && (
            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground">
              +{listing.skills.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="mt-6 px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between gap-4">
        
        <div className="flex gap-4 text-xs font-medium text-muted-foreground border-r border-border pr-4">
           {listing.commentCount > 0 && (
              <span className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors">
                <MessageSquare className="h-4 w-4" /> {listing.commentCount}
              </span>
           )}
           {isAsset && listing.downloadCount && (
              <span className="flex items-center gap-1.5">
                <HardDriveDownload className="h-4 w-4" /> {listing.downloadCount.toLocaleString()}
              </span>
           )}
        </div>

        <div className="flex-1 flex justify-end gap-2">
          {isAsset ? (
             <>
               {listing.type === 'template' && (
                  <Button variant="outline" size="sm" className="h-8 shadow-none hidden sm:flex">
                     <GitFork className="h-3.5 w-3.5 mr-1.5" /> Fork
                  </Button>
               )}
               <Button 
                  size="sm" 
                  variant={downloadState === 'installed' ? 'secondary' : 'default'}
                  onClick={handleDownload}
                  disabled={downloadState === 'downloading'}
                  className={cn(
                    "h-8 relative overflow-hidden transition-all w-28",
                    downloadState === 'installed' && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  )}
               >
                 {downloadState === 'idle' && (
                   <span className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5"/> Install</span>
                 )}
                 {downloadState === 'downloading' && (
                   <>
                     <div className="absolute inset-0 bg-primary/20" />
                     <div className="absolute inset-y-0 left-0 bg-primary opacity-20 transition-all duration-75" style={{ width: `${progress}%` }} />
                     <span className="relative text-xs">{progress}%</span>
                   </>
                 )}
                 {downloadState === 'installed' && (
                   <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4"/> Launch</span>
                 )}
               </Button>
             </>
          ) : (
             <Button size="sm" className="h-8" onClick={() => setApplyOpen(true)}>
                {['talent', 'team'].includes(listing.type) ? 'Connect' : 'Apply'}
             </Button>
          )}
        </div>
      </div>
    </div>
    <ApplyToListingModal listing={listing} open={applyOpen} onOpenChange={setApplyOpen} />
    </>
  );
}
