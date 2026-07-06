"use client";
import Shell from "@/components/layout/Shell";
import MainHeader from "@/features/marketplace/views/main/MainHeader";
import ExploreHubView from "@/features/marketplace/views/main/ExploreHubView";

export default function MarketplacePage() {
  return (
    <Shell noPadding>
      <MainHeader />
      <ExploreHubView />
    </Shell>
  );
}
