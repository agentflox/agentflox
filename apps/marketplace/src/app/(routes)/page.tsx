"use client";
import Shell from "@/components/layout/Shell";
import ExploreHubView from "@/features/marketplace/views/main/ExploreHubView";

export default function MarketplacePage() {
  return (
    <Shell noPadding hideSidebar>
      <ExploreHubView />
    </Shell>
  );
}
