"use client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";

export type TeamScope = "all" | "owned" | "participated";

export interface UseTeamListOptions {
  workspaceId?: string;
  spaceId?: string;
  projectId?: string;
  initialScope?: TeamScope;
  initialPage?: number;
  pageSize?: number;
  syncWithUrl?: boolean;
}

export function useTeamList(options: UseTeamListOptions = {}) {
  const {
    workspaceId,
    spaceId,
    projectId,
    initialScope = "owned",
    initialPage = 1,
    pageSize: initialPageSize = 12,
    syncWithUrl = true,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TeamScope>(initialScope);
  const [filters, setFilters] = useState<{ industries: string[]; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "" }>({ industries: [], status: "" as any });

  useEffect(() => {
    if (options.pageSize && options.pageSize !== pageSize) {
      setPageSize(options.pageSize);
    }
  }, [options.pageSize]);

  const listInput = useMemo(
    () => ({
      page,
      pageSize,
      query: query.trim() || undefined,
      scope,
      industry: filters.industries?.length ? filters.industries : undefined,
      status: (filters.status || undefined) as any,
      workspaceId: workspaceId || undefined,
      spaceId: spaceId !== undefined ? spaceId : undefined,
    }),
    [page, pageSize, query, scope, filters, workspaceId, spaceId]
  );

  const { data, isLoading, isFetching } = trpc.team.list.useQuery(listInput as any, {
    staleTime: 30_000,
    placeholderData: keepPreviousData
  });
  const utils = trpc.useUtils();

  useEffect(() => {
    const base = { ...listInput, page: 1 } as any;
    utils.team.list.prefetch(base);
    utils.team.list.prefetch({ ...base, page: 2 });
  }, [utils, listInput.query, listInput.scope, listInput.industry, listInput.status, listInput.workspaceId, listInput.spaceId]);

  useEffect(() => {
    if ((data?.items?.length || 0) === pageSize) {
      utils.team.list.prefetch({ ...listInput, page: page + 1 } as any);
    }
  }, [utils, data?.items?.length, pageSize, page, listInput]);

  useEffect(() => {
    if (!syncWithUrl) return;
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (query) params.set("q", query); else params.delete("q");
    if (scope && scope !== "owned") params.set("scope", scope); else params.delete("scope");
    if (filters.status) params.set("status", String(filters.status)); else params.delete("status");
    if (page > 1) params.set("page", String(page)); else params.delete("page");
    if (pageSize !== 12) params.set("pageSize", String(pageSize)); else params.delete("pageSize");
    if (typeof window !== "undefined") {
      const search = params.toString();
      const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [query, scope, page, pageSize, filters.status, syncWithUrl]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    isLoading,
    isFetching,
    page,
    pageSize,
    setPage,
    setPageSize,
    totalPages,
    total,
    query,
    setQuery,
    scope,
    setScope,
    filters,
    setFilters,
  };
}



