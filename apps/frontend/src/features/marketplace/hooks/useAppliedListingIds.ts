"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

/**
 * One batched fetch of the current user's marketplace applications.
 * Use at list/grid parents and pass `hasApplied` into ListingCard — never query per card.
 */
export function useAppliedListingIds() {
  const { data: session } = useSession();
  const { data: applications } = trpc.marketplace.myApplications.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  return useMemo(() => {
    const ids = new Set<string>();
    for (const app of applications ?? []) {
      if (app.listingId) ids.add(app.listingId);
    }
    return ids;
  }, [applications]);
}
