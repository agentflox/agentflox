"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TASK_LIST_PAGE_SIZE } from "@/features/dashboard/constants";
import type { TaskListRelationMode } from "@/entities/task/hooks/useTaskList";

export type { TaskListRelationMode };

export interface UseTaskListInfiniteParams {
  spaceId?: string;
  projectId?: string;
  teamId?: string;
  listId?: string;
  scope?: "owned" | "assigned" | "all";
  enabled?: boolean;
  /** `true` = full relations; `"card"` = status/type/locations/parent + assignees */
  includeRelations?: TaskListRelationMode;
}

export function useTaskListInfinite({
  spaceId,
  projectId,
  teamId,
  listId,
  scope,
  enabled = true,
  includeRelations = true,
}: UseTaskListInfiniteParams) {
  const baseInput = useMemo(
    () => ({
      spaceId,
      projectId,
      teamId,
      listId,
      scope,
      includeRelations,
      pageSize: TASK_LIST_PAGE_SIZE,
    }),
    [spaceId, projectId, teamId, listId, scope, includeRelations]
  );

  const isEnabled = enabled && !!(spaceId || projectId || teamId || listId || scope);

  const [page, setPage] = useState(1);
  const [accumulatedTasks, setAccumulatedTasks] = useState<any[]>([]);

  useEffect(() => {
    setPage(1);
    setAccumulatedTasks([]);
  }, [spaceId, projectId, teamId, listId, scope, includeRelations]);

  const query = trpc.task.list.useQuery(
    { ...baseInput, page },
    { enabled: isEnabled, staleTime: 30_000 }
  );

  useEffect(() => {
    if (!query.data) return;
    setAccumulatedTasks((prev) =>
      page === 1 ? query.data.items : [...prev, ...query.data.items]
    );
  }, [query.data, page]);

  const total = query.data?.total ?? 0;
  const tasks = accumulatedTasks;
  const hasMore = tasks.length < total;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (hasMore && !query.isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, query.isFetching]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return {
    tasks,
    total,
    hasMore,
    isLoading: query.isLoading && page === 1,
    isFetchingNextPage: query.isFetching && page > 1,
    loadMore,
    loadMoreRef,
    refetch: query.refetch,
    taskListInput: baseInput,
  };
}
