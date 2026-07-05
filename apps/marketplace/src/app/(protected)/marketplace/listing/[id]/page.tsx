"use client";

import { use } from "react";
import Shell from "@/components/layout/Shell";
import ListingDetailView from "@/features/marketplace/components/ListingDetailView";
import { mockListings } from "@/features/marketplace/constants/mockData";
import { trpc } from "@/lib/trpc";
import { notFound } from "next/navigation";

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const listingId = resolvedParams.id;
  
  const { data: listing, isLoading, error } = trpc.marketplace.get.useQuery({ id: listingId });

  if (isLoading) {
    return <div className="p-20 text-center animate-pulse"><span className="text-muted-foreground">Loading listing...</span></div>;
  }

  if (error || !listing) {
    notFound();
  }

  return (
    <div className="flex-1 w-full relative">
       {/* Usually in a real layout we might hide the main shell sidebar or keep it. We'll render inside it. */}
       <ListingDetailView listing={listing as any} />
    </div>
  );
}
