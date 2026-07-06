"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ApplyToListingForm } from "@/features/marketplace/components/ApplyToListingForm";
import { ArrowLeft } from "lucide-react";

export default function ListingApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const listingId = resolvedParams.id;
  const { data: listing, isLoading } = trpc.marketplace.get.useQuery({ id: listingId });

  if (isLoading || !listing) {
    return <div className="p-20 text-center text-muted-foreground">Loading apply form...</div>;
  }

  return (
    <div className="bg-background text-foreground pb-24">
      {/* Sticky Top Nav */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/marketplace/listing/${listingId}`)} className="-ml-2 gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listing
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10">
        <ApplyToListingForm
          listing={listing as any}
          onCancel={() => router.push(`/marketplace/listing/${listingId}`)}
        />
      </div>
    </div>
  );
}

