"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DashboardContentSection } from "../../types";

export function ContentSection({
  title,
  description,
  viewAllHref,
  viewAllText = "View all",
  items,
  isLoading,
  renderItem,
  skeletonCount = 4,
  emptyState,
  headerAction,
}: DashboardContentSection) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {viewAllHref ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={viewAllHref}>{viewAllText}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyState ?? "No items yet."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <div key={item?.id ?? index}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </section>
  );
}
