"use client";
import Shell from "@/components/layout/Shell";
import ExploreHubView from "@/features/marketplace/views/main/ExploreHubView";
import Footer from "@/components/layout/Footer";

export default function MarketplacePage() {
  return (
    <Shell noPadding hideSidebar>
      <div className="flex flex-col min-h-full">
        <div className="flex-1">
          <ExploreHubView />
        </div>
        <Footer />
      </div>
    </Shell>
  );
}
