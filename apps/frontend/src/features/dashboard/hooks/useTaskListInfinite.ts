"use client";

import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TASK_LIST_PAGE_SIZE } from "@/features/dashboard/constants";
import type { TaskListRelationMode } from "@/entities/task/hooks/useTaskList";

export type { TaskListRelationMode };

export interface UseTaskListInfiniteParams {
  workspaceId?: string;
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
  workspaceId,
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
      workspaceId,
      spaceId,
      projectId,
      teamId,
      listId,
      scope,
      includeRelations,
      pageSize: TASK_LIST_PAGE_SIZE,
    }),
    [workspaceId, spaceId, projectId, teamId, listId, scope, includeRelations]
  );

  const isEnabled = enabled && !!(workspaceId || spaceId || projectId || teamId || listId || scope);

  const [page, setPage] = useState(1);
  const [accumulatedTasks, setAccumulatedTasks] = useState<any[]>([]);

  // Track the last server-data object we processed so we only merge new data,
  // not re-run on every render with the same cached response.
  // This prevents optimistic tasks from being wiped by a stale effect re-run.
  const lastProcessedDataRef = useRef<any>(null);

  useEffect(() => {
    setPage(1);
    setAccumulatedTasks([]);
    lastProcessedDataRef.current = null;
  }, [workspaceId, spaceId, projectId, teamId, listId, scope, includeRelations]);

  const query = trpc.task.list.useQuery(
    { ...baseInput, page },
    { enabled: isEnabled, staleTime: 30_000 }
  );

  useEffect(() => {
    if (!query.data) return;

    // KEY FIX: Skip if server data object hasn't changed.
    // React Query returns the same object reference when the cache hasn't changed.
    // Without this guard, every parent re-render triggers this effect and can wipe
    // any optimistic tasks added via addTaskToList.
    if (query.data === lastProcessedDataRef.current) {
      return;
    }

    lastProcessedDataRef.current = query.data;

    setAccumulatedTasks((prev) => {
      if (page === 1) {
        return query.data.items;
      }
      // Append-only deduplication for page > 1
      const existingIds = new Set(prev.map(t => t.id));
      const newItems = query.data.items.filter((t: any) => !existingIds.has(t.id));
      return [...prev, ...newItems];
    });
  }, [query.data, page]);

  const updateTaskInList = useCallback((taskId: string, updater: (task: any) => any) => {
    setAccumulatedTasks(prev =>
      prev.map(task => (task.id === taskId ? updater(task) : task))
    );
  }, []);

  const addTaskToList = useCallback((task: any) => {
    setAccumulatedTasks(prev => [...prev, task]);
  }, []);

  const removeTaskFromList = useCallback((taskId: string) => {
    setAccumulatedTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

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
    updateTaskInList,
    addTaskToList,
    removeTaskFromList,
  };
}
