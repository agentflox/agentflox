"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Edit2, Play, Pause, Trash2, Eye, MoreHorizontal, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MyListingsView() {
  const { data: listings, isLoading } = trpc.marketplace.myListings.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">Loading your listings...</span>
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="flex flex-col h-48 items-center justify-center border border-dashed rounded-xl space-y-3">
        <p className="text-sm text-muted-foreground">You haven't listed anything on the marketplace yet.</p>
        <Button onClick={() => window.location.href = '/marketplace'}>
          Publish to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h3 className="text-xl font-semibold">My Listings</h3>
        <p className="text-sm text-muted-foreground">Manage the assets and opportunities you are offering.</p>
      </div>

      <div className="grid gap-3">
        {listings.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow">
            
            {/* Left Info */}
            <div className="flex items-start gap-4 mb-4 sm:mb-0">
              <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center shrink-0 text-white font-semibold shadow-inner",
                item.status === 'active' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-zinc-300'
              )}>
                {item.type.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-base truncate">{item.title}</h4>
                  <Badge variant="outline" className={cn("text-[10px]", item.status === 'active' ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "bg-muted")}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground uppercase">{item.type}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {Math.floor(Math.random() * 500)} views
                  </span>
                  <span>•</span>
                  <span>{item._count.applications} apps</span>
                  <span>•</span>
                  <span>{item._count.orders} sales</span>
                  {item.priceCredits !== null && item.priceCredits > 0 && (
                     <><span>•</span><span className="font-medium text-foreground">{item.priceCredits} Credits</span></>
                  )}
                  {item.isFree && <><span>•</span><span className="font-medium text-emerald-600">Free</span></>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => window.open(`/marketplace/listing/${item.id}`, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 px-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2"><Edit2 className="h-4 w-4" /> Edit Details</DropdownMenuItem>
                  {item.status === 'active' ? (
                    <DropdownMenuItem className="gap-2"><Pause className="h-4 w-4" /> Pause Listing</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="gap-2"><Play className="h-4 w-4" /> Activate</DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="gap-2"><Copy className="h-4 w-4" /> Copy Link</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
