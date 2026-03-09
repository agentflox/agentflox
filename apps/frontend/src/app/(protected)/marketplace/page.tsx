"use client";
import Shell from "@/components/layout/Shell";
import MainHeader from "@/features/marketplace/views/main/MainHeader";
import MainView from "@/features/marketplace/views/main/MainView";

export default function MarketplacePage() {
  return (
    <Shell>
      <MainHeader />
      <MainView />
    </Shell>
  );
}
