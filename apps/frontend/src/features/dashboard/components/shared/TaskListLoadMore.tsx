"use client";

import { Loader2 } from "lucide-react";

interface TaskListLoadMoreProps {
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  loaded: number;
  total: number;
}

export function TaskListLoadMore({
  loadMoreRef,
  hasMore,
  isFetchingNextPage,
  loaded,
  total,
}: TaskListLoadMoreProps) {
  if (!hasMore && loaded === 0) return null;

  return (
    <div
      ref={loadMoreRef}
      className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground"
    >
      {isFetchingNextPage ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading more tasks...
        </>
      ) : hasMore ? (
        <span>
          Showing {loaded} of {total} tasks
        </span>
      ) : total > 0 ? (
        <span>All {total} tasks loaded</span>
      ) : null}
    </div>
  );
}
