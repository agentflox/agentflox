"use client";

import { Suspense } from "react";
import Shell from "@/components/layout/Shell";
import MainHeader from "@/features/marketplace/views/main/MainHeader";
import SearchView from "@/features/marketplace/views/search/SearchView";

export default function MarketplaceSearchPage() {
  return (
    <Shell noPadding>
      <MainHeader />
      <Suspense fallback={<div className="p-24 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <SearchView />
      </Suspense>
    </Shell>
  );
}
