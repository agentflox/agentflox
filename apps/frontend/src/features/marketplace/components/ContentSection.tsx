"use client";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ContentSectionProps {
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

export function ContentSection({
  children,
  isLoading,
  isEmpty,
  emptyState,
  className,
}: ContentSectionProps) {
  if (isEmpty && !isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        {emptyState || (
          <div className="space-y-2">
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
