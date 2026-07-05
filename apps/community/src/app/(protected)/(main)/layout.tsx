"use client";

import { CommunitySidebar } from "../../../features/community/components/CommunitySidebar";
import { usePathname } from "next/navigation";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreenPage = pathname?.includes("/members") || pathname?.includes("/appeals");

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
      {isFullscreenPage ? (
        <main className="min-w-0">
          {children}
        </main>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
          <CommunitySidebar />
          <main className="min-w-0 space-y-6">
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
