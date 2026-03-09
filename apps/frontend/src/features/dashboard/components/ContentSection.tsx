import Link from "next/link";
import Button from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CardSkeleton from "@/components/ui/card.skeleton";
import { DashboardContentSection } from "../types";

export function ContentSection({
  id,
  title,
  description,
  viewAllHref,
  viewAllText = "View full list",
  items = [],
  isLoading = false,
  renderItem,
  skeletonCount = 3,
  emptyState,
  headerAction
}: DashboardContentSection) {
  const hasItems = items.length > 0;
  const showEmpty = !isLoading && !hasItems && emptyState;

  return (
    <section id={id} className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {viewAllHref && (
            <Link href={viewAllHref}>
              <Button variant="outline">{viewAllText}</Button>
            </Link>
          )}
        </div>
      </div>

      {showEmpty ? (
        <div className="flex items-center justify-center p-8 text-center">
          {emptyState}
        </div>
      ) : (
        <ScrollArea className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-4">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="min-w-[280px]">
                {renderItem(item)}
              </div>
            ))}
            {isLoading && Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="min-w-[280px]">
                <CardSkeleton />
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
